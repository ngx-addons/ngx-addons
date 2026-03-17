import { InjectionToken, Provider, Type } from '@angular/core';
import { OMNI_AUTH_ICON_COMPONENT } from './ui/icon-template.token';
import { SignUpComponentConfig } from './signup/signup.component';
import { SignInComponentConfig } from './signin/signin.component';

export type AuthUiConfig = {
  /**
   * Hide message when user is authenticated.
   */
  hideAuthenticatedContent?: boolean;

  signUp?: SignUpComponentConfig;
  signIn?: SignInComponentConfig;

  /**
   * Icon component to render icon names. The component must accept an `icon` input of type string.
   * If not provided, icon names will be rendered as plain text.
   */
  iconComponent?: Type<unknown>;
};

export const AUTH_UI_CONFIG = new InjectionToken<AuthUiConfig>('AUTH_UI_CONFIG');

export const configureAuthUi = (params: AuthUiConfig): Provider[] => {
  const providers: Provider[] = [
    {
      provide: AUTH_UI_CONFIG,
      useValue: params,
    },
  ];

  if (params.iconComponent) {
    providers.push({
      provide: OMNI_AUTH_ICON_COMPONENT,
      useValue: params.iconComponent,
    });
  }

  return providers;
};
