import {ChangeDetectionStrategy, Component, inject, input, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {InputComponent} from '../ui/input/input.component';
import {
  AUTH_CONFIG,
  AuthConfig,
  AuthRouteService,
  ContentConfig,
  OmniAuthService,
  patterns
} from '@ngx-addons/omni-auth-core';
import {ButtonComponent} from '../ui/button/button.component';
import {MatCheckbox} from '@angular/material/checkbox';
import {PrintErrorComponent} from '../print-error/print-error.component';
import {MapToNativeInputTypePipe} from '../ui/map-to-native-input-type.pipe';
import {AUTH_UI_CONFIG, AuthUiConfig} from '../configure-auth-ui';

export type AttributesContent = {
  label: string,
  placeholder: string,
  requiredText: string,
  minLengthText?: string,
  maxLengthText?: string,
  patternText?: string,
}

type AttributesValidation = {
  minLength: number;
  maxLength: number;
  pattern: RegExp;
  isRequired: boolean;
}

type PhoneAttributeConfig = {
  type: 'phone';
  key: string;
  validation: Partial<AttributesValidation> & { isRequired: boolean };
  content: AttributesContent;
}

type EmailAttributeConfig = {
  type: 'email';
  key: string;
  validation: Partial<AttributesValidation> & { isRequired: boolean };
  content: AttributesContent;
}

type CheckboxAttributeConfig = {
  type: 'checkbox';
  key: string;
  validation: Pick<AttributesValidation, 'isRequired'>;
  content: Pick<AttributesContent, 'label' | 'requiredText'>;
}

type TextAttributeConfig = {
  type: 'text';
  key: string;
  validation: Partial<AttributesValidation> & { isRequired: boolean };
  content: AttributesContent;
}

export type AttributeFieldConfig =
  TextAttributeConfig
  | EmailAttributeConfig
  | PhoneAttributeConfig
  | CheckboxAttributeConfig;

export type SignUpComponentConfig = {
  attributes?: AttributeFieldConfig[]
}

@Component({
  selector: 'omni-auth-ui-mat-signup',
  standalone: true,
  imports: [CommonModule, InputComponent, FormsModule, ButtonComponent, MatCheckbox, PrintErrorComponent, MapToNativeInputTypePipe],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss', './../auth-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignUpComponent {
  #authService = inject<OmniAuthService>(OmniAuthService);
  #env = inject<AuthConfig>(AUTH_CONFIG);
  #uiConfig = inject<AuthUiConfig>(AUTH_UI_CONFIG, { optional: true });
  env = inject<AuthConfig>(AUTH_CONFIG);
  authRoute = inject(AuthRouteService);
  readonly processing = signal(false);
  readonly content = input.required<Pick<ContentConfig, 'signUp' | 'common' | 'errors'>>();

  get config() {
    return this.#uiConfig?.signUp;
  }
  readonly termsAndConditions = output();

  #defaultIdentifierPattern = (this.#env.identifierType === 'email' ? patterns.emailPattern : patterns.usernamePattern);
  identifierPattern = this.#env.validation?.identifierPattern || this.#defaultIdentifierPattern;
  passwordPattern = this.#env.validation?.passwordPattern || patterns.passwordPattern;
  emailPattern = patterns.emailPattern;
  phonePattern = patterns.phonePattern;

  user: {
    identifier: string | null;
    password: string | null;
    customAttributes: Record<string, string | boolean>;
  } = {
    identifier: null,
    password: null,
    customAttributes: {}
  };

  async onSubmit() {
    const identifier = this.user.identifier ?? this.authRoute.currentIdentifier();
    const password = this.user.password;
    const attributes = this.user.customAttributes;

    if (!identifier || !password) {
      return;
    }

    this.processing.set(true);

    await this.#authService.signUp({
      identifier,
      password,
      attributes: {
        ...attributes
      },
    });

    this.processing.set(false);
  }

  updateUserIdentifier($event: string) {
    this.user.identifier = $event;

    // if (!this.config()?.fullName?.enabled || !this.config()?.fullName?.enableAutoFill) {
    //   return;
    // }
    //
    // const nextIdentifier = emailToFullName($event) || $event;
    // if (nextIdentifier) {
    //   this.user.fullName = nextIdentifier
    // }
  }

  updateUserAttribute(key: string, value: string | boolean) {
    if (!this.user.customAttributes) {
      this.user.customAttributes = {};
    }

    this.user.customAttributes[key] = value;
  }
}
