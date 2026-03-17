import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputComponent } from '../ui/input/input.component';
import {
  AUTH_CONFIG,
  AuthConfig,
  AuthRouteService,
  ContentConfig,
  OmniAuthService,
  patterns,
} from '@ngx-addons/omni-auth-core';
import { ButtonComponent } from '../ui/button/button.component';
import {
  SignInProvider,
  SocialButtonsComponent,
} from '../social-buttons/social-buttons.component';
import { PrintErrorComponent } from '../print-error/print-error.component';
import { AUTH_UI_CONFIG, AuthUiConfig } from '../configure-auth-ui';

export type SignInComponentConfig = {
  signInProviders?: SignInProvider[];
};

@Component({
  selector: 'omni-auth-ui-mat-signin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputComponent,
    ButtonComponent,
    SocialButtonsComponent,
    PrintErrorComponent,
  ],
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss', './../auth-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent {
  #authService = inject(OmniAuthService);
  #authRoute = inject(AuthRouteService);
  #env = inject<AuthConfig>(AUTH_CONFIG);
  #uiConfig = inject<AuthUiConfig>(AUTH_UI_CONFIG, { optional: true });

  readonly content =
    input.required<
      Pick<ContentConfig, 'signIn' | 'socialButtons' | 'common' | 'errors'>
    >();

  get config() {
    return this.#uiConfig?.signIn;
  }

  readonly processing = signal(false);

  get currentIdentifier() {
    return this.#authRoute.currentIdentifier;
  }

  get isPasswordlessEnabled() {
    return Boolean(this.#env.passwordlessEnabled);
  }

  user = {
    identifier: null,
    password: null,
  };
  #defaultIdentifierPattern = (this.#env.identifierType === 'email' ? patterns.emailPattern : patterns.usernamePattern);
  identifierPattern = this.#env.validation?.identifierPattern || this.#defaultIdentifierPattern;
  passwordPattern = this.#env.validation?.passwordPattern || patterns.passwordPattern;

  async onSubmit() {
    const identifier = this.user.identifier ?? this.#authRoute.currentIdentifier();
    const password = this.user.password;

    const isValidPassword = this.#env.passwordlessEnabled || Boolean(password);
    if (!identifier || !isValidPassword) {
      return;
    }

    this.processing.set(true);
    await this.#authService.signIn({
      identifier,
      password: password ?? undefined,
    });

    this.processing.set(false);
  }

  navigateToReset() {
    const state = this.#authService.connectorConfig.resetPasswordConfirmation === 'code' ? 'reset_password' : 'reset_password_link';
    this.#authRoute.nextStep(
      state,
      this.user.identifier ? { identifier: this.user.identifier } : undefined,
    );
  }
}
