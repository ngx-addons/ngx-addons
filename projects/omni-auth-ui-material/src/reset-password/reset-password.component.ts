import {ChangeDetectionStrategy, Component, inject, input, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MessageComponent} from '../ui/message/message.component';
import {InputComponent} from '../ui/input/input.component';
import {
  AUTH_CONFIG,
  AuthConfig,
  AuthRouteService,
  ContentConfig,
  OmniAuthService,
  patterns,
} from '@ngx-addons/omni-auth-core';
import {FormsModule} from '@angular/forms';
import {ButtonComponent} from '../ui/button/button.component';
import {PrintErrorComponent} from '../print-error/print-error.component';

@Component({
  selector: 'omni-auth-ui-mat-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputComponent,
    MessageComponent,
    MessageComponent,
    ButtonComponent,
    PrintErrorComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss', '../auth-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordComponent {
  #authService = inject(OmniAuthService);
  #env = inject<AuthConfig>(AUTH_CONFIG);
  authRoute = inject(AuthRouteService);
  readonly content = input.required<Pick<ContentConfig, 'resetPassword' | 'common' | 'errors'>>();
  readonly isLinkMode = input<boolean>(false);

  user: {
    identifier: string | null;
    code: string | null;
    password: string | null;
  } = {
    identifier: null,
    code: null,
    password: null,
  };

  #defaultIdentifierPattern = (this.#env.identifierType === 'email' ? patterns.emailPattern : patterns.usernamePattern);
  identifierPattern = this.#env.validation?.identifierPattern || this.#defaultIdentifierPattern;
  passwordPattern = this.#env.validation?.passwordPattern || patterns.passwordPattern;

  readonly resending = signal(false);
  readonly processing = signal(false);
  readonly emailSent = signal(false);

  async sendEmail() {
    const identifier = this.user.identifier ?? this.authRoute.currentIdentifier();

    if (!identifier) {
      return;
    }

    this.resending.set(true);

    const hasError = await this.#authService.forgotPassword({
      identifier,
    });

    this.resending.set(false);

    if (!hasError) {
      this.emailSent.set(true);
    }
  }

  async onSubmit() {
    const identifier = this.user.identifier ?? this.authRoute.currentIdentifier();
    const newPassword = this.user.password;
    const code = this.user.code;

    if (!identifier || !newPassword || !code) {
      return;
    }

    this.processing.set(true);
    await this.#authService.confirmForgotPassword({
      identifier,
      code: String(code),
      newPassword,
    });

    this.processing.set(false);
  }
}
