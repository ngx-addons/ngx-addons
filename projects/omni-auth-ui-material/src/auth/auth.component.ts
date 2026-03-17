import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatTabsModule} from '@angular/material/tabs';
import {ConfirmSignUpComponent} from '../confirm-signup/confirm-signup.component';
import {SignUpComponent} from '../signup/signup.component';
import {SignInComponent} from '../signin/signin.component';
import {ResetPasswordComponent} from '../reset-password/reset-password.component';
import {
  AUTH_CONFIG,
  AuthRouteService,
  ContentConfig,
  defaultContentEmail, defaultContentUsername,
  OmniAuthService
} from '@ngx-addons/omni-auth-core';
import {MessageComponent} from '../ui/message/message.component';
import {ButtonComponent} from '../ui/button/button.component';
import {LoaderComponent} from '../ui/loader/loader.component';
import {AuthenticatedComponent} from '../authenticated/authenticated.component';
import {ConfirmSigninComponent} from '../confirm-signin/confirm-signin.component';
import {
  AuthenticatedChangePasswordComponent
} from '../authenticated-change-password/authenticated-change-password.component';
import {AUTH_UI_CONFIG, AuthUiConfig} from '../configure-auth-ui';

@Component({
  selector: 'omni-auth-ui-mat',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    SignInComponent,
    SignUpComponent,
    ConfirmSignUpComponent,
    ResetPasswordComponent,
    MessageComponent,
    ButtonComponent,
    LoaderComponent,
    AuthenticatedComponent,
    ConfirmSigninComponent,
    AuthenticatedChangePasswordComponent,
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthComponent {
  authService = inject(OmniAuthService);
  authRouteService = inject(AuthRouteService);
  #env = inject(AUTH_CONFIG);
  uiConfig = inject<AuthUiConfig>(AUTH_UI_CONFIG, { optional: true });

  readonly content = input<ContentConfig>(this.#env.identifierType === 'email' ? defaultContentEmail : defaultContentUsername);
}
