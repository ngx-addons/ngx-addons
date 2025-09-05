export type EnvironmentType = {
  cognito: {
    userPoolId: string;
    userPoolClientId: string;
    userPoolDomain: string;
  };
  apiTestingUrl: string;
};
