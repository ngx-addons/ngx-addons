import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  resource,
  ResourceRef,
} from '@angular/core';
import {
  EmailOtpType,
  MobileOtpType,
  ResendParams,
  SignInWithPasswordCredentials,
  SignInWithPasswordlessCredentials,
  SignUpWithPasswordCredentials,
  Provider as SupabaseProvider,
  VerifyOtpParams,
} from '@supabase/supabase-js';
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
  SignInProviderKey,
  TokenFetcher,
  TokenProxy,
} from '@ngx-addons/omni-auth-core';
import { SupabaseAuthState } from './supabase-auth-state';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, startWith, Subscription, switchMap } from 'rxjs';
import {
  SUPABASE_CLIENT,
} from './configure-auth-supabase-connector';
import { SupabaseClient } from '@supabase/supabase-js';

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const parts = token.split('.');
  if (parts.length !== 3) {return {};}

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
};

const tokenFetcher = (supabaseClient: SupabaseClient): TokenFetcher => async (refresh: boolean) => {
  const session = refresh
    ? (await supabaseClient.auth.refreshSession()).data.session
    : (await supabaseClient.auth.getSession()).data.session;

  if (!session?.access_token) {
    return null;
  }

  const payload = decodeJwtPayload(session.access_token) as JwtToken['payload'];
  const token = new JwtToken(session.access_token, payload);

  return {
    idToken: token,
    accessToken: token,
  };
};

@Injectable()
export class AuthSupabaseService extends OmniAuthService {
  override connectorConfig = {
    identityConfirmation: "link" as const,
    resetPasswordConfirmation: "link" as const
  };

  #authRouteService = inject(AuthRouteService);
  #actionErrorCollector = inject(ActionErrorCollectorService);
  #env = inject<AuthConfig>(AUTH_CONFIG);
  #supabaseClient = inject<SupabaseClient>(SUPABASE_CLIENT);
  #destroyRef = inject(DestroyRef);
  #navigateOnLoad$?: Subscription;

  constructor() {
    super();
    this.#startListening();

    this.#destroyRef.onDestroy(() => {
      this.#authStateChangeUnsubscribe?.();
      this.#navigateOnLoad$?.unsubscribe();
    });
  }

  #authStateChangeUnsubscribe?: () => void;

  #startListening() {
    this.#authStateChangeUnsubscribe = this.#supabaseClient.auth.onAuthStateChange((event) => {
      switch (event) {
        case 'SIGNED_IN':
        case 'SIGNED_OUT':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          this.#actionErrorCollector.reset();
          this.authState.reload();
          break;
        case 'PASSWORD_RECOVERY':
          this.#actionErrorCollector.reset();
          break;
      }
    }).data.subscription.unsubscribe;
  }

  authState: ResourceRef<AuthState> = resource({
    defaultValue: SupabaseAuthState.unknown(),
    loader: async () => {
      try {
        const { data } = await this.#supabaseClient.auth.getSession();

        if (!data.session) {
          return SupabaseAuthState.fromUnauthenticated();
        }

        const { data: userData } = await this.#supabaseClient.auth.getUser();

        if (!userData.user) {
          throw 'Runtime error: user authenticated, but cannot be fetched';
        }

        const user = userData.user;
        const userMetadata = user.user_metadata || {};

        return SupabaseAuthState.fromAuthenticated(
          {
            displayName: userMetadata['full_name'] ?? user.email ?? '',
            email: user.email,
            fullName: userMetadata['full_name'] as string | undefined,
            phone: user.phone,
            verified: Boolean(user.email_confirmed_at || user.phone_confirmed_at),
          },
          new TokenProxy(tokenFetcher(this.#supabaseClient)),
        );
      } catch (error) {
        return SupabaseAuthState.fromError(new OmniAuthError(error));
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

      await this.#supabaseClient.auth.signOut({
        scope: fromAllDevices ? 'global' : 'local',
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

      const credentials = this.#withIdentifier<SignUpWithPasswordCredentials>({
        password: params.password,
        options: {
          data: {
            full_name: params.fullName,
            ...params.attributes,
          },
        },
      }, params.identifier);

      const { data, error } = await this.#supabaseClient.auth.signUp(credentials);

      if (error) {
        throw error;
      }

      if (data.user && !data.session) {
        this.#authRouteService.nextStep('confirm_sign_up_link', {
          identifier: params.identifier,
        });
      } else if (data.session) {
        this.#onLoginSuccess();
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

      const credentials = this.#buildVerifyOtpParams(params.identifier, params.code, 'email', 'sms');

      const { error } = await this.#supabaseClient.auth.verifyOtp(credentials);

      if (error) {
        throw error;
      }

      this.#onLoginSuccess();
    } catch (error) {
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

      const credentials = this.#buildVerifyOtpParams(params.identifier, params.code, 'signup', 'sms');

      const { error } = await this.#supabaseClient.auth.verifyOtp(credentials);

      if (error) {
        throw error;
      }

      this.#authRouteService.nextStep('login', { identifier: params.identifier });
    } catch (error) {
      return this.#handleError(this.#transformError('confirmSignUp', error));
    }
  }

  async resendSignUpCode(params: { identifier: string }): Promise<void | FlowError> {
    try {
      this.#actionErrorCollector.reset();

      const credentials = this.#withIdentifier<ResendParams>({
        type: 'signup',
      }, params.identifier);

      const { error } = await this.#supabaseClient.auth.resend(credentials);

      if (error) {
        throw error;
      }
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

      if (this.#env.passwordlessEnabled) {
        const credentials = this.#withIdentifier<SignInWithPasswordlessCredentials>({}, params.identifier);
        const { error } = await this.#supabaseClient.auth.signInWithOtp(credentials);

        if (error) {
          throw error;
        }

        this.#authRouteService.nextStep('confirm_sign_in', {
          identifier: params.identifier,
        });
      } else {
        const credentials = this.#withIdentifier<SignInWithPasswordCredentials>({
          password: params.password || '',
        }, params.identifier);
        const { error } = await this.#supabaseClient.auth.signInWithPassword(credentials);

        if (error) {
          throw error;
        }

        this.#onLoginSuccess();
      }
    } catch (error) {
      return this.#handleError(this.#transformError('signIn', error));
    }
  }

  async forgotPassword(params: { identifier: string }): Promise<void | FlowError> {
    try {
      this.#actionErrorCollector.reset();

      const { error } = await this.#supabaseClient.auth.resetPasswordForEmail(
        params.identifier,
      );

      if (error) {
        throw error;
      }

      this.#authRouteService.nextStep('reset_password_link', {
        identifier: params.identifier,
      });
    } catch (error) {
      return this.#handleError(this.#transformError('forgotPassword', error));
    }
  }

  async changePassword(params: { newPassword: string; }): Promise<void | FlowError> {
    try {
      this.#actionErrorCollector.reset();

      const { error: updateError } = await this.#supabaseClient.auth.updateUser({
        password: params.newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      this.#authRouteService.nextStep('login');
    } catch (error) {
      return this.#handleError(this.#transformError('changePassword', error));
    }
  }

  async confirmForgotPassword(_params: {
    identifier: string;
    code: string;
    newPassword: string;
  }): Promise<void | FlowError> {
    return this.#handleError(
      new FlowError(
        'confirmForgotPassword',
        'unknown',
        'Supabase uses link-based password recovery. Use changePassword after the user clicks the recovery link.',
      ),
    );
  }

  async signInWithProvider(
    provider: SignInProviderKey,
  ): Promise<void | FlowError> {
    try {
      this.#actionErrorCollector.reset();

      const providerMap: Record<string, SupabaseProvider> = {
        google: 'google',
        github: 'github',
        facebook: 'facebook',
        apple: 'apple',
        discord: 'discord',
        linkedin: 'linkedin_oidc',
        microsoft: 'azure',
      };

      const supabaseProvider = providerMap[provider];

      if (!supabaseProvider) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      const { error } = await this.#supabaseClient.auth.signInWithOAuth({
        provider: supabaseProvider,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      return this.#handleError(this.#transformError('signInWithProvider', error));
    }
  }

  #withIdentifier<T>(base: Record<string, unknown>, identifier: string): T {
    if (this.#env.identifierType === 'phone') {
      return { ...base, phone: identifier } as T;
    }
    return { ...base, email: identifier } as T;
  }

  #buildVerifyOtpParams(identifier: string, token: string, emailType: EmailOtpType, phoneType: MobileOtpType): VerifyOtpParams {
    if (this.#env.identifierType === 'phone') {
      return { phone: identifier, token, type: phoneType };
    }
    return { email: identifier, token, type: emailType };
  }

  #transformError(source: FlowError['source'], error: unknown) {
    const errorMessage = String(error);
    const lowerMessage = errorMessage.toLowerCase();

    switch (true) {
      case lowerMessage.includes('user already registered'):
        return new FlowError(source, 'userAlreadyExists', error);
      case lowerMessage.includes('invalid login credentials'):
        return new FlowError(source, 'incorrectIdentifierOrPassword', error);
      case lowerMessage.includes('email not confirmed'):
        return new FlowError(source, 'userIsNotConfirmed', error);
      case lowerMessage.includes('token has expired') ||
        lowerMessage.includes('invalid otp'):
        return new FlowError(source, 'invalidCode', error);
      case lowerMessage.includes('user not found'):
        return new FlowError(source, 'userDoesNotExist', error);
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