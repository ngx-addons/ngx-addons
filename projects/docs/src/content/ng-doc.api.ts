import { NgDocApi } from '@ng-doc/core';

const Api: NgDocApi = {
  title: 'API References',
  order: 99,
  scopes: [
    {
      name: 'OmniAuthCore',
      route: 'omni-auth-core',
      include: 'projects/omni-auth-core/src/**/*.ts',
      exclude: '**/*.spec.ts',
    },
    {
      name: 'OmniAuthCognito',
      route: 'omni-auth-cognito',
      include: 'projects/omni-auth-cognito/src/**/*.ts',
      exclude: '**/*.spec.ts',
    },
    {
      name: 'OmniAuthUiMaterial',
      route: 'omni-auth-ui-material',
      include: 'projects/omni-auth-ui-material/src/**/*.ts',
      exclude: '**/*.spec.ts',
    },
  ],
};

export default Api;
