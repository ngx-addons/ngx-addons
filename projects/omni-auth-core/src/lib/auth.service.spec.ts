import {computed, resource} from '@angular/core';
import {
  AuthState,
  isError,
  OmniAuthService,
} from './auth.service';
import {OmniAuthError} from './error/auth-error';
import {TokenProxy} from './token/token-proxy';
import {of} from 'rxjs';



export class OmniAuthServiceMock implements OmniAuthService {
  connectorConfig = {
    identityConfirmation: "code" as const,
    resetPasswordConfirmation: "code" as const
  };

  authState = resource<AuthState, unknown>({
    defaultValue: {
      state: 'unknown',
    },
    loader: async () => {
      return {
        state: 'authenticated',
        user: {
          displayName: 'Display Name',
          email: 'name@sample-email.com',
          verified: true,
          tokens: new TokenProxy(async () => null),
        },
      };
    },
  });

  readonly currentUser = computed(() => this.authState.value()?.user);

  idToken$ = of(null);

  accessToken$ = of(null);

  signOut = async () => {
    return;
  };

  resendSignUpCode = async () => {
    return;
  };

  signUp = async () => {
    return;
  };

  confirmSignUp = async () => {
    return;
  };

  confirmSignIn = async () => {
    return;
  };

  changePassword = async () => {
    return;
  };

  signIn = async () => {
    return;
  };
  forgotPassword = async () => {
    return;
  };
  confirmForgotPassword = async () => {
    return;
  };
  signInWithProvider = async () => {
    return;
  };
}

describe('isError', () => {
  it('should return true when response is an OmniAuthError instance', () => {
    const error = new OmniAuthError('Test error');

    expect(isError(error)).toBe(true);
  });

  it('should return false when response is void/undefined', () => {
    expect(isError(undefined)).toBe(false);
    expect(isError(void 0)).toBe(false);
  });

  it('should return false when response is null', () => {
    expect(isError(null as any)).toBe(false);
  });

  it('should return false when response is not an OmniAuthError instance', () => {
    const regularError = new Error('Regular error');

    expect(isError(regularError as any)).toBe(false);
  });
});
