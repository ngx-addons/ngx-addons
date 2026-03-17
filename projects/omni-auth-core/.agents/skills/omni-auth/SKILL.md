---
name: omni-auth
description: Use when working with authentication in Angular projects that use @ngx-addons/omni-auth — covers setup, configuration, auth flows, UI components, guards, interceptors, and connector integration for AWS Cognito and Supabase.
---

# OmniAuth for Angular

OmniAuth (`@ngx-addons/omni-auth-*`) is a modular authentication library for Angular using a **connector pattern**: a core package defines the abstract auth interface, UI packages provide ready-made components, and connector packages plug in specific auth backends.

## Packages

| Package | Purpose |
|---------|---------|
| `@ngx-addons/omni-auth-core` | Core service, guards, interceptor, types |
| `@ngx-addons/omni-auth-ui-material` | Material Design auth UI components |
| `@ngx-addons/omni-auth-cognito` | AWS Cognito connector |
| `@ngx-addons/omni-auth-supabase` | Supabase connector |

## Setup

### 1. Configure the core

Call `configureAuth()` in your app bootstrap providers:

```typescript
import { configureAuth } from '@ngx-addons/omni-auth-core';
import { AuthAwsCognitoService } from '@ngx-addons/omni-auth-cognito';

bootstrapApplication(AppComponent, {
  providers: [
    configureAuth({
      authService: AuthAwsCognitoService,
      identifierType: 'email', // 'email' | 'username' | 'phone'
      bearerAuthentication: {
        whitelistedEndpoints: [/^https:\/\/api\.example\.com/],
      },
      routing: {
        secured: ['/dashboard'],
        guest: ['/login'],
      },
    }),
  ],
});
```

**`configureAuth()` options:**

- `authService` (required) — the connector service class (`AuthAwsCognitoService` or `AuthSupabaseService`)
- `identifierType` — `'email'` (default), `'username'`, or `'phone'`
- `passwordlessEnabled` — enable passwordless auth flow
- `bearerAuthentication.whitelistedEndpoints` — endpoints that receive JWT tokens (empty array = all endpoints)
- `bearerAuthentication.headerName` — custom header (default: `'Authorization'`)
- `bearerAuthentication.headerValuePrefix` — custom prefix (default: `'Bearer '`)
- `routing.secured` — route after login
- `routing.guest` — route after logout
- `validation.identifierPattern` — custom identifier regex
- `validation.passwordPattern` — custom password regex

### 2. Configure the connector

**AWS Cognito:**

```typescript
import { configureAuthCognitoConnector } from '@ngx-addons/omni-auth-cognito';

configureAuthCognitoConnector({
  cognito: {
    userPoolId: 'us-east-1_xxxxxxxxx',
    userPoolClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    oauth: {
      domain: 'myapp.auth.us-east-1.amazoncognito.com',
      providers: ['Google'],
      redirectSignIn: ['https://example.com/callback'],
      redirectSignOut: ['https://example.com/login'],
    },
  },
})
```

**Supabase:**

```typescript
import { configureAuthSupabaseConnector } from '@ngx-addons/omni-auth-supabase';

configureAuthSupabaseConnector({
  url: 'https://xxxxx.supabase.co',
  publishableKey: 'eyJhbGciOi...',
})
```

### 3. Configure the UI (optional)

```typescript
import { configureAuthUi } from '@ngx-addons/omni-auth-ui-material';

configureAuthUi({
  hideAuthenticatedContent: false,
  signIn: {
    signInProviders: [
      { key: 'google', label: 'Continue with Google', icon: { src: '/google.svg', alt: 'Google' } },
    ],
  },
  signUp: {
    attributes: [
      {
        type: 'text',
        key: 'firstName',
        validation: { isRequired: true, minLength: 2 },
        content: { label: 'First Name', placeholder: 'John', requiredText: 'Required' },
      },
    ],
  },
  iconComponent: MyCustomIconComponent,
})
```

### 4. Add the JWT interceptor

```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { jwtInterceptor } from '@ngx-addons/omni-auth-core';

provideHttpClient(withInterceptors([jwtInterceptor]))
```

## OmniAuthService

The abstract `OmniAuthService` class is the main API. Inject it to interact with auth state and trigger auth flows.

### Reactive State

- `authState: ResourceRef<AuthState>` — Angular Resource with auth state. Use `authState.value()` to read, `authState.isLoading()` for loading state, `authState.reload()` to refresh.
- `currentUser: Signal<AuthState['user']>` — signal with current user info or `undefined`
- `idToken$: Observable<JwtToken | null | undefined>` — ID token stream (`undefined` = loading, `null` = unauthenticated)
- `accessToken$: Observable<JwtToken | null | undefined>` — access token stream

### AuthState

```typescript
type AuthState = {
  state: 'unknown' | 'authenticated' | 'unauthenticated' | 'error';
  user?: {
    displayName?: string;
    email?: string;
    fullName?: string;
    phone?: string;
    verified: boolean;
  };
  tokens?: TokenProxy;
  error?: OmniAuthError;
};
```

### Methods

All methods return `Promise<void | FlowError>`. Use `isError()` to check the result.

```typescript
import { OmniAuthService, isError } from '@ngx-addons/omni-auth-core';

const result = await this.authService.signIn({ identifier: 'user@example.com', password: 'secret' });
if (isError(result)) {
  console.error(result.code, result.getErrorMessage());
}
```

| Method | Parameters | Purpose |
|--------|-----------|---------|
| `signIn()` | `{ identifier, password? }` | Sign in (password optional for passwordless) |
| `signUp()` | `{ identifier, password, attributes? }` | Register new user |
| `signOut()` | `fromAllDevices?: boolean` | Log out |
| `confirmSignUp()` | `{ identifier, code }` | Confirm registration with code |
| `confirmSignIn()` | `{ identifier, code }` | Confirm passwordless sign-in |
| `resendSignUpCode()` | `{ identifier }` | Resend confirmation code |
| `forgotPassword()` | `{ identifier }` | Start password reset |
| `confirmForgotPassword()` | `{ identifier, code?, newPassword }` | Complete password reset |
| `changePassword()` | `{ newPassword }` | Change password (authenticated) |
| `signInWithProvider()` | `providerKey` | Social login (`'google'`, `'facebook'`, `'apple'`, `'github'`, `'microsoft'`) |

### Connector Config

Each connector declares its confirmation strategy:

- **Cognito:** `identityConfirmation: 'code'`, `resetPasswordConfirmation: 'code'`
- **Supabase:** `identityConfirmation: 'link'`, `resetPasswordConfirmation: 'link'`

## Auth Guards

```typescript
import { onlyAuthenticated, onlyGuest } from '@ngx-addons/omni-auth-core';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent, canActivate: [onlyAuthenticated()] },
  { path: 'login', component: LoginComponent, canActivate: [onlyGuest()] },
  // With custom redirect:
  { path: 'admin', component: AdminComponent, canActivate: [onlyAuthenticated({ redirectTo: ['/login'] })] },
];
```

## UI Component

Use the `<omni-auth-ui-mat>` component for a complete auth UI:

```html
<omni-auth-ui-mat [content]="customContent">
  <div auth-header>Welcome to MyApp</div>
  <div auth-footer>Need help? Contact support.</div>
  <div sign-in-footer><a routerLink="/terms">Terms</a></div>
  <div sign-up-footer><a routerLink="/privacy">Privacy Policy</a></div>
  <div auth-user-is-authenticated>You are logged in!</div>
</omni-auth-ui-mat>
```

### Content Projection Slots

- `[auth-header]` — header above auth forms
- `[auth-footer]` — footer below auth forms
- `[sign-in-footer]` — footer in sign-in form
- `[sign-up-footer]` — footer in sign-up form
- `[auth-user-is-authenticated]` — shown when user is authenticated

### Content Customization

Override text labels by passing a `ContentConfig` object to `[content]`. Defaults are available:

```typescript
import { defaultContentEmail, defaultContentUsername } from '@ngx-addons/omni-auth-core';
```

`ContentConfig` has sections: `loggedIn`, `common`, `signIn`, `signUp`, `confirmationSignUp`, `confirmationSignIn`, `resetPassword`, `socialButtons`, `errors`.

### Icon Customization

Provide a custom icon component via `configureAuthUi({ iconComponent: MyIconComponent })` or the `OMNI_AUTH_ICON_COMPONENT` injection token. The component must accept an `icon: string` input.

Icon names used: `'chevron_backward'`, `'email'`, `'info'`, `'warning'`.

### Social Login Providers

```typescript
configureAuthUi({
  signIn: {
    signInProviders: [
      { key: 'google', label: 'Continue with Google', icon: { src: '/google.svg', alt: 'Google' } },
      { key: 'github', label: 'Sign in with GitHub', icon: { src: '/github.svg', alt: 'GitHub' }, fullWidth: true },
    ],
  },
})
```

`SignInProvider` fields: `key` (required), `label`, `tooltip`, `icon: { src, alt }`, `fullWidth`.

### Custom Sign-Up Attributes

```typescript
configureAuthUi({
  signUp: {
    attributes: [
      { type: 'text', key: 'firstName', validation: { isRequired: true }, content: { label: 'First Name', placeholder: 'John', requiredText: 'Required' } },
      { type: 'email', key: 'workEmail', validation: { isRequired: false }, content: { label: 'Work Email', placeholder: 'john@company.com', requiredText: 'Required' } },
      { type: 'phone', key: 'phone', validation: { isRequired: false }, content: { label: 'Phone', placeholder: '+1234567890', requiredText: 'Required' } },
      { type: 'checkbox', key: 'termsAccepted', validation: { isRequired: true }, content: { label: 'I accept the terms', requiredText: 'You must accept' } },
    ],
  },
})
```

Attribute types: `'text'`, `'email'`, `'phone'`, `'checkbox'`. Validation options: `isRequired`, `minLength`, `maxLength`, `pattern`.

## Error Handling

```typescript
import { FlowError, isError, type ActionErrorCode } from '@ngx-addons/omni-auth-core';
```

`FlowError` properties:
- `source` — which flow produced the error (e.g. `'signIn'`, `'signUp'`, `'forgotPassword'`)
- `code: ActionErrorCode` — specific error code
- `error` — original error object
- `getErrorMessage()` — human-readable message

`ActionErrorCode` values: `'unknown'`, `'signInWithRedirectFailure'`, `'notVerified'`, `'userDoesNotExist'`, `'userAlreadyExists'`, `'userIsNotConfirmed'`, `'alreadySignedIn'`, `'incorrectIdentifierOrPassword'`, `'invalidConfiguration'`, `'cancelledFlow'`, `'invalidCode'`.

Use `ErrorMessagePipe` in templates to display errors: `{{ error | errorMessage }}`.

Use `ActionErrorCollectorService` to collect and display errors from auth flows.

## Validation Patterns

```typescript
import * as patterns from '@ngx-addons/omni-auth-core';

patterns.emailPattern     // RFC 5322 email validation
patterns.passwordPattern  // Min 8 chars, uppercase, lowercase, digit, special char
patterns.usernamePattern  // Alphanumeric, dots, underscores, hyphens
patterns.phonePattern     // International phone format
```

## Token Access

```typescript
// Via observable
this.authService.idToken$.subscribe(token => {
  if (token) console.log(token.payload, token.isExpired());
});

// Via AuthState
const state = this.authService.authState.value();
const idToken = await state?.tokens?.getIdToken();
const accessToken = await state?.tokens?.getAccessToken();
```

`JwtToken` API: `token` (raw string), `payload` (decoded), `expireAt`, `isExpired()`, `isValid()`, `toString()`.
