import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AUTH_CONFIG, AuthConfig } from '../../configure-auth';

type AuthStep =
  | 'login'
  | 'register'
  | 'reset_password'
  | 'reset_password_link'
  | 'confirm_reset_password'
  | 'confirm_sign_in'
  | 'confirm_sign_up'
  | 'confirm_sign_up_link'
  | 'change_password';

@Injectable()
export class AuthRouteService {
  #router = inject(Router);
  #env = inject<AuthConfig>(AUTH_CONFIG);

  readonly currentStep = signal<AuthStep>('login');

  readonly currentIdentifier = signal<string | null>(null);

  nextStep(state: AuthStep, details: { identifier?: string } = {}) {
    this.currentStep.set(state);

    this.currentIdentifier.set(details.identifier ?? null);
  }

  navigateToGuestPage(_rememberPage = false) {
    // todo - implement rememberPage logic
    if (!this.#env.routing?.guest) {
      return;
    }

    return this.#router.navigate(this.#env.routing.guest);
  }

  navigateToSecuredPage() {
    if (!this.#env.routing?.secured) {
      return;
    }

    return this.#router.navigate(this.#env.routing.secured);
  }
}
