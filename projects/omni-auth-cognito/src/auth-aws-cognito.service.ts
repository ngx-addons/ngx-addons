import {
  computed,
  inject,
  Injectable,
  resource,
  ResourceRef,
} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {
  confirmResetPassword,
  confirmSignIn,
  confirmSignUp,
  fetchAuthSession,
  fetchUserAttributes,
  resendSignUpCode,
  resetPassword,
  signIn,
  signInWithRedirect,
  SignInWithRedirectInput,
  signOut,
  signUp,
} from 'aws-amplify/auth';
import {Hub} from 'aws-amplify/utils';
import {
  ActionErrorCollectorService,
  AUTH_CONFIG,
  AuthConfig,
  AuthRouteService,
  AuthState,
  FlowError,
  JwtToken,
  OmniAuthError,
  OmniAuthService,
  RuntimeError,
  SignInProviderKey,
  TokenFetcher,
  TokenProxy,
} from '@ngx-addons/omni-auth-core';
import {CognitoAuthState} from './cognito-auth-state';
import {Router} from '@angular/router';
import {toObservable} from '@angular/core/rxjs-interop';
import {filter, map, startWith, Subscription, switchMap} from 'rxjs';
import {
  AUTH_COGNITO_CONFIG,
  AuthCognitoConfig,
} from './configure-auth-cognito-connector';

const tokenFetcher: TokenFetcher = async (refresh: boolean) => {
  const refreshedTokens = await fetchAuthSession({
    forceRefresh: refresh,
  });

  const idToken = refreshedTokens?.tokens?.idToken;
  const accessToken = refreshedTokens?.tokens?.accessToken;

  if (!idToken || !accessToken) {
    return null;
  }

  return {
    idToken: new JwtToken(idToken.toString(), idToken.payload),
    accessToken: new JwtToken(accessToken.toString(), accessToken.payload),
  };
};

@Injectable()
export class AuthAwsCognitoService extends OmniAuthService {
  override connectorConfig = {
    identityConfirmation: "code" as const,
    resetPasswordConfirmation: "code" as const
  };

  #authRouteService = inject(AuthRouteService);
  #actionErrorCollector = inject(ActionErrorCollectorService);
  #router = inject(Router);
  #env = inject<AuthConfig>(AUTH_CONFIG);
  #envCognito = inject<AuthCognitoConfig>(AUTH_COGNITO_CONFIG);
  #document = inject<Document>(DOCUMENT);
  #navigateOnLoad$?: Subscription;

  constructor() {
    super();
    this.startListening()
  }

  #hubListenerCancelToken = () => {
    // noop: replaced when startListening() is called
  };

  startListening() {
    this.#hubListenerCancelToken = Hub.listen('auth', ({payload}) => {
      this.#actionErrorCollector.reset();
      switch (payload.event) {
        case 'signInWithRedirect':
          this.#onLoginSuccess();
          this.stopListening();
          break;
        case 'signInWithRedirect_failure':
          this.stopListening();
          this.#handleError(
            this.#transformError('signInWithProvider', payload.data.error),
          );
          break;
        case 'customOAuthState':
          this.stopListening();
          this.#handleError(
            new FlowError(
              'signInWithProvider',
              'invalidConfiguration',
              new RuntimeError('Custom OAuth state handling not implemented'),
            ),
          );
          break;
      }
    });
  }

  stopListening() {
    this.#hubListenerCancelToken();
  }

  authState: ResourceRef<AuthState> = resource({
    defaultValue: CognitoAuthState.unknown(),
    loader: async () => {
      try {
        const session = await fetchAuthSession();
        if (!session?.tokens) {
          return CognitoAuthState.fromUnauthenticated();
        }

        const user = await fetchUserAttributes();

        if (!user) {
          throw 'Runtime error: user authenticated, but cannot be fetched';
        }

        return CognitoAuthState.fromAuthenticated(
          {
            displayName: user.name ?? user.email ?? '',
            email: user.email,
            fullName: user.name,
            phone: user.phone_number,
            verified: Boolean(user.email_verified),
          },
          new TokenProxy(tokenFetcher),
        );
      } catch (e) {
        return CognitoAuthState.fromError(new OmniAuthError(e));
      }
    },
  });

  accessToken$ = toObservable(this.authState.value).pipe(
    startWith(undefined),
    map((state) => state?.tokens || null),
    switchMap(async (tokenProxy) => tokenProxy?.getAccessToken() ?? null),
  );

  idToken$ = toObservable(this.authState.value).pipe(
    startWith(undefined),
    map((state) => state?.tokens || null),
    switchMap(async (tokenProxy) => tokenProxy?.getIdToken() ?? null),
  );

  readonly currentUser = computed(() => {
    const state = this.authState.value();

    return state.user;
  });

  #isAuthenticated$ = toObservable(
    computed(() => {
      const state = this.authState.value();
      return state.state === 'authenticated';
    }),
  ).pipe(filter(Boolean));

  async signOut(fromAllDevices = false): Promise<void | FlowError> {
    try {
      this.#actionErrorCollector.reset();
      const window = this.#document.defaultView;

      if (!window) {
        throw new RuntimeError(
          'Window is not available. Cannot sign out.',
          'Make sure to run this code in a browser environment.',
        );
      }

      const allowedRedirectUrls =
        this.#envCognito.cognito.oauth?.redirectSignOut ?? [];
      const baseUrl = window.location.origin;
      const possibleUrls = [baseUrl, `${baseUrl}/`];

      if (this.#env.routing?.guest) {
        const guestUrl = `${baseUrl}/${this.#router.createUrlTree(this.#env.routing?.guest).toString()}`;

        possibleUrls.unshift(guestUrl);
        possibleUrls.unshift(`${guestUrl}/`);
      }

      const redirectUrl = possibleUrls.find((url) =>
        allowedRedirectUrls.includes(url),
      );

      await signOut({
        global: fromAllDevices,
        oauth: {
          redirectUrl,
        },
      });

      this.authState.reload();
      this.#authRouteService.navigateToGuestPage();
    } catch (error) {
      return this.#handleError(this.#transformError('signOut', error));
    }
  }

  async signUp(params: {
    password: string;
    identifier: string;
    fullName?: string;
    attributes?: Record<string, string | boolean | number | Date>;
  }): Promise<void | FlowError> {
    try {
      this.#actionErrorCollector.reset();

      const attributes = Object.fromEntries(
        Object.entries(params.attributes || {}).map(([key, value]) => {
          return [
            key,
            typeof value === 'number' ? value : String(value),
          ];
        }),
      );

      const email = this.#env.identifierType === 'email' ? params.identifier : undefined;

      const {nextStep} = await signUp({
        username: params.identifier,
        password: params.password,
        options: {
          userAttributes: {
            email,
            name: params.fullName,
            ...attributes,
          },
        },
      });

      switch (nextStep.signUpStep) {
        case 'DONE':
          this.#authRouteService.nextStep('login', {identifier: params.identifier});
          break;
        case 'CONFIRM_SIGN_UP':
          this.#authRouteService.nextStep('confirm_sign_up', {
            identifier: params.identifier,
          });
          break;
        case 'COMPLETE_AUTO_SIGN_IN':
          this.#authRouteService.nextStep('login', {identifier: params.identifier});
          break;
      }
    } catch (error) {
      return this.#handleError(this.#transformError('signUp', error));
    }
  }

  async confirmSignIn(params: {
    identifier: string;
    code: string;
  }): Promise<void | FlowError> {
    try {
      this.#actionErrorCollector.reset();
      const {nextStep} = await confirmSignIn({
        challengeResponse: params.code,
      });

      switch (nextStep.signInStep) {
        case 'DONE':
          this.#onLoginSuccess();
          break;
        case 'CONFIRM_SIGN_UP':
          this.#authRouteService.nextStep('confirm_sign_up', {
            identifier: params.identifier,
          });
          break;
        default:
          throw new RuntimeError('Unexpected next step: ' + nextStep);
      }

    } catch (error: unknown) {
      return this.#handleError(this.#transformError('confirmSignIn', error));
    }
  }

  async confirmSignUp(params: {
    identifier: string;
    code: string;
    newPassword: string;
  }): Promise<void | FlowError> {
    try {
      this.#actionErrorCollector.reset();

      const {nextStep} = await confirmSignUp({
        username: params.identifier,
        confirmationCode: params.code,
      });

      switch (nextStep.signUpStep) {
        case 'DONE':
          this.#authRouteService.nextStep('login', {identifier: params.identifier});
          break;
        case 'CONFIRM_SIGN_UP':
          this.#authRouteService.nextStep('confirm_sign_up', {
            identifier: params.identifier,
          });
          break;
        case 'COMPLETE_AUTO_SIGN_IN':
          this.#authRouteService.nextStep('login', {identifier: params.identifier});
          break;
        default:
          throw new RuntimeError('Unexpected next step: ' + nextStep);
      }
    } catch (error: unknown) {
      if (
        'message' in (error as Record<string, unknown>) &&
        (error as Record<string, unknown>)['message'] ===
        'User cannot be confirmed. Current status is CONFIRMED'
      ) {
        this.#authRouteService.nextStep('login', {identifier: params.identifier});
      }
      return this.#handleError(this.#transformError('signIn', error));
    }
  }

  async resendSignUpCode(params: { identifier: string }): Promise<void | FlowError> {
    try {
      this.#actionErrorCollector.reset();

      await resendSignUpCode({
        username: params.identifier,
      });
    } catch (error) {
      return this.#handleError(this.#transformError('resendSignUpCode', error));
    }
  }

  async signIn(params: {
    identifier: string;
    password?: string;
  }): Promise<void | FlowError> {
    try {
      this.#actionErrorCollector.reset();
      let response;

      if (this.#env.passwordlessEnabled) {
        response = await signIn({
          username: params.identifier,
          options: {
            authFlowType: 'USER_AUTH',
            preferredChallenge: 'EMAIL_OTP',
          },
        });
      } else {
        response = await signIn({
          username: params.identifier,
          password: params.password,
        });
      }

      switch (response.nextStep.signInStep) {
        case 'DONE':
          this.#onLoginSuccess();
          break;
        case 'CONFIRM_SIGN_UP':
          this.#authRouteService.nextStep('confirm_sign_up', {
            identifier: params.identifier,
          });
          break;
        case 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE':
        case 'CONFIRM_SIGN_IN_WITH_SMS_CODE':
          this.#authRouteService.nextStep('confirm_sign_in', {
            identifier: params.identifier,
          });
          break;
        case 'RESET_PASSWORD':
          this.#authRouteService.nextStep('reset_password', {
            identifier: params.identifier,
          });
          break;

        default:
          throw new RuntimeError('Unexpected next step: ' + response.nextStep);
      }
    } catch (error) {
      return this.#handleError(this.#transformError('signIn', error));
    }
  }

  async forgotPassword(params: { identifier: string }): Promise<void | FlowError> {
    try {
      this.#actionErrorCollector.reset();

      const {nextStep} = await resetPassword({
        username: params.identifier,
      });

      switch (nextStep.resetPasswordStep) {
        case 'DONE':
          this.#authRouteService.nextStep('login', {identifier: params.identifier});
          break;
        case 'CONFIRM_RESET_PASSWORD_WITH_CODE':
          this.#authRouteService.nextStep('reset_password', {
            identifier: params.identifier,
          });
          break;
        default:
          throw new RuntimeError('Unexpected next step: ' + nextStep);
      }
    } catch (error) {
      return this.#handleError(this.#transformError('forgotPassword', error));
    }
  }

  async confirmForgotPassword(params: {
    identifier: string;
    code?: string;
    newPassword: string;
  }): Promise<void | FlowError> {
    try {
      if (!params.code) {
        throw new RuntimeError(
          'Code is required to confirm forgot password',
          'Make sure to call forgotPassword first.'
        )
      }
      this.#actionErrorCollector.reset();

      await confirmResetPassword({
        username: params.identifier,
        confirmationCode: params.code,
        newPassword: params.newPassword,
      });

      this.#authRouteService.nextStep('login', {identifier: params.identifier});
    } catch (error) {
      return this.#handleError(
        this.#transformError('confirmForgotPassword', error),
      );
    }
  }

  async changePassword(): Promise<void | FlowError> {
    throw new FlowError('changePassword', 'unknown', 'Method not supported. Use forgotPassword and confirmForgotPassword instead.')
  }

  async signInWithProvider(
    provider: SignInProviderKey,
  ): Promise<void | FlowError> {
    try {
      this.#actionErrorCollector.reset();

      let amazonProvider: SignInWithRedirectInput['provider'];

      switch (provider) {
        case 'google':
          amazonProvider = 'Google';
          break;
        case 'facebook':
          amazonProvider = 'Facebook';
          break;
        case 'apple':
          amazonProvider = 'Apple';
          break;
        case 'amazon':
          amazonProvider = 'Amazon';
          break;
        default:
          amazonProvider = {
            custom: provider,
          };
      }

      await signInWithRedirect({
        provider: amazonProvider,
      });
    } catch (error) {
      return this.#handleError(
        this.#transformError('signInWithProvider', error),
      );
    }
  }

  #transformError(source: FlowError['source'], error: unknown) {
    switch (true) {
      case String(error).includes(
        'Cannot reset password for the user as there is no registered/verified email',
      ):
        return new FlowError(source, 'notVerified', error);
      case String(error).includes('already a signed in user'):
        return new FlowError(source, 'alreadySignedIn', error);
      case String(error).includes('User already exists.'):
        return new FlowError(source, 'userAlreadyExists', error);
      case String(error).includes('User is not confirmed.'):
        return new FlowError(source, 'userIsNotConfirmed', error);
      case String(error).includes('User does not exist.'):
      case String(error).includes('Username/client id combination not found.'):
        return new FlowError(source, 'userDoesNotExist', error);
      case String(error).includes('Incorrect username or password.'):
        return new FlowError(source, 'incorrectIdentifierOrPassword', error);
      case String(error).includes(
        'Invalid verification code provided, please try again',
      ):
        return new FlowError(source, 'invalidCode', error);
      case String(error).includes('The given preferredRedirectUrl'):
        console.error(error);
        return new FlowError(source, 'invalidConfiguration', error, true);
      case String(error).includes('User cancelled OAuth flow'):
        console.error(error);
        return new FlowError(source, 'cancelledFlow', error, true);
      case String(error).includes('can not be converted to'):
        return new FlowError(
          source,
          'invalidConfiguration',
          new RuntimeError(
            'Invalid configuration, see console for details',
            'Make sure you set up the attributes options correctly.',
          ),
          true,
        );
      default:
        console.error(error);
        return new FlowError(source, 'unknown', error);
    }
  }

  #handleError(error: FlowError) {
    this.#actionErrorCollector.handle(error);
    return error;
  }

  #onLoginSuccess() {
    this.#authRouteService.nextStep('login');
    this.authState.reload();

    if (this.#navigateOnLoad$) {
      return;
    }

    this.#navigateOnLoad$ = this.#isAuthenticated$.subscribe(() => {
      this.#authRouteService.navigateToSecuredPage();
      this.#navigateOnLoad$?.unsubscribe();
      this.#navigateOnLoad$ = undefined;
    });
  }
}
