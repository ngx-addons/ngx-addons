import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
} from '@angular/core';
import {
  AuthComponent,
  AuthComponentConfig,
} from '@ngx-addons/omni-auth-ui-material';
import { NgDocThemeService } from '@ng-doc/app/services/theme';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconRegistry } from '@angular/material/icon';

@Component({
  selector: 'demo-cognito-with-material',
  imports: [AuthComponent],
  template: `
    <div
      class="material-demo mat-typography"
      [class]="[theme(), currentTheme()]"
    >
      <omni-auth-ui-mat [config]="config">
        <p sign-up-footer>
          By signing up, you agree to our
          <a class="link" tabindex="0">terms and conditions</a>
        </p>
      </omni-auth-ui-mat>
    </div>
  `,
  styleUrls: ['cognito-with-material.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class CognitoWithMaterialComponent implements OnInit {
  protected readonly themeService = inject(NgDocThemeService);
  protected readonly iconRegistry = inject(MatIconRegistry);

  readonly theme = input<'blue' | 'azure' | 'green' | 'orange'>('green');
  readonly change = toSignal(this.themeService.themeChanges());
  readonly currentTheme = computed(() => {
    this.change();

    if (!this.themeService.currentTheme) {
      return 'light';
    }

    return this.themeService.currentTheme as 'auto' | 'dark';
  });

  ngOnInit(): void {
    this.iconRegistry.setDefaultFontSetClass('material-symbols-outlined');
  }

  config: AuthComponentConfig = {
    signIn: {
      signInProviders: [
        {
          label: 'Google',
          tooltip: 'Sign in with Google',
          key: 'google',
        },
        {
          label: 'Facebook',
          tooltip: 'Sign in with Facebook',
          key: 'facebook',
        },
        {
          label: 'Apple',
          tooltip: 'Sign in with Apple',
          key: 'apple',
        },
        {
          label: 'GitHub',
          tooltip: 'Sign in with GitHub',
          key: 'github',
        },
        {
          label: 'Custom Provider',
          tooltip: 'Sign in with a custom provider',
          key: 'custom-provider',
        },
      ],
    },
    signUp: {
      fullName: {
        enabled: true,
        enableAutoFill: true,
      },
      additionalAttributes: [
        {
          key: 'newsletterConsent',
          type: 'checkbox',
          isRequired: true,
          label: 'Subscribe to our newsletter',
        },
      ],
    },
  };
}
