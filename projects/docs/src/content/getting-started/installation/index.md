---
keyword: InstallationPage
---

All start with installing the core package. You can use either npm, pnpm, or yarn.

```bash group="installation" name="npm"
npm install @ngx-addons/omni-auth-core
```

```bash group="installation" name="pnpm"
pnpm add @ngx-addons/omni-auth-core
```

```bash group="installation" name="yarn"
yarn install @ngx-addons/omni-auth-core
```

## Install connector

Then you need to choose and install one of the available connector packages.

> **Note**
> Connectors are responsible for integrating with different authentication backends. Currently, we support AWS Cognito.

Here is the list of available connectors:

| Connector Name | Status | Package                       |                                                                                    |
| -------------- | :----: | :---------------------------- |------------------------------------------------------------------------------------|
| Cognito        |   ✅   | @ngx-addons/omni-auth-cognito | ![NPM Version](https://img.shields.io/npm/v/%40ngx-addons%2Fomni-auth-cognito)[](https://www.npmjs.com/package/@ngx-addons/omni-auth-cognito) |
| Firebase       |   🔜   | 🔜                            |                                                                                    |


```bash group="connector" name="npm"
npm install @ngx-addons/omni-auth-cognito
```

```bash group="connector" name="pnpm"
pnpm add @ngx-addons/omni-auth-cognito
```

```bash group="connector" name="yarn"
yarn install @ngx-addons/omni-auth-cognito
```

## Install UI package

Finally, you can install one of the available UI packages.

> **Note**
> UI packages provide pre-built components and styles for authentication-related user interfaces. Currently, we support Material Design.


| UI Package | Status | Package                            |                                                                                                                                                       |
|------------| :----: |:-----------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| Material   |   ✅   | @ngx-addons/omni-auth-ui-material  | ![NPM Version](https://img.shields.io/npm/v/%40ngx-addons%2Fomni-auth-ui-material)[](https://www.npmjs.com/package/@ngx-addons/omni-auth-ui-material) |


```bash group="ui" name="npm"
npm install @ngx-addons/omni-auth-ui-material
```

```bash group="ui" name="pnpm"
pnpm add @ngx-addons/omni-auth-ui-material
```

```bash group="ui" name="yarn"
yarn install @ngx-addons/omni-auth-ui-material
```

## Put it all together

Here is an example of how to configure the `OmniAuthModule` in your Angular application:

```typescript
import { configureAuth } from "@ngx-addons/omni-auth-core";

configureAuth({
  authService: AuthAwsCognitoService, // provide selected connector package
  bearerAuthentication: {
    whitelistedEndpoints: [environment.apiUrl],
  },
  routing: {
    secured: ["/", "protected"],
    guest: ["/"],
  },
});
```
