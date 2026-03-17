import {ChangeDetectionStrategy, Component, computed, inject, input, OnInit, ViewEncapsulation,} from '@angular/core';
import {AuthComponent, configureAuthUi,} from '@ngx-addons/omni-auth-ui-material';
import {NgDocThemeService} from '@ng-doc/app/services/theme';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatIconRegistry} from '@angular/material/icon';
import {configureAuth} from '@ngx-addons/omni-auth-core';
import {AuthAwsCognitoService, configureAuthCognitoConnector} from '@ngx-addons/omni-auth-cognito';
import {environment} from '../../environments/environment';

@Component({
  selector: 'demo-cognito-with-material',
  imports: [AuthComponent],
  template: `
    <div
      class="material-demo mat-typography"
      [class]="[theme(), currentTheme()]"
    >
      <omni-auth-ui-mat>
        <p sign-up-footer>
          By signing up, you agree to our
          <a class="link" tabindex="0">terms and conditions</a>
        </p>
      </omni-auth-ui-mat>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  providers: [
    configureAuth({
      authService: AuthAwsCognitoService
    }),
    configureAuthCognitoConnector({
      cognito: {
        userPoolId: environment.cognito.userPoolId,
        userPoolClientId: environment.cognito.userPoolClientId,
      },
    }),
    configureAuthUi({
      signUp: {
        attributes: [
          {
            key: 'phone',
            type: 'phone',
            validation: {
              isRequired: true,
            },
            content: {
              placeholder: '+12 345 678 9012',
              label: 'Phone Number',
              requiredText: 'This field is required',
              minLengthText: 'Phone number must be at least 10 characters long',
              maxLengthText: 'Phone number must be at most 15 characters long',
              patternText: 'Phone number must be a valid phone number',
            }
          },
          {
            key: 'fullName',
            type: 'text',
            validation: {
              isRequired: true,
              minLength: 2,
              maxLength: 255,
              pattern: new RegExp(/^[a-zA-Z0-9_.-]*$/),
            },
            content: {
              label: 'Full name',
              requiredText: 'Full name is required',
              minLengthText: 'Full name needs to be at least 2 characters long',
              maxLengthText: 'Full name can be maximum 255 characters long',
              placeholder: 'Joe Doe',
              patternText: 'Full name must be a valid name',
            }
          },
          {
            key: 'newsletterConsent',
            type: 'checkbox',
            validation: {
              isRequired: true,
            },
            content: {
              label: 'Subscribe to our newsletter',
              requiredText: 'This field is required',
            }
          },
        ],
      },
    }),
  ]
})
export class CognitoWithMaterialAdditionalFieldsComponent implements OnInit {
  protected readonly themeService = inject(NgDocThemeService);
  protected readonly iconRegistry = inject(MatIconRegistry);

  readonly theme = input<'blue' | 'azure' | 'green' | 'orange' | 'magenta'>(
    'azure',
  );
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
}
