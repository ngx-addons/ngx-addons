import { NgDocPage } from '@ng-doc/core';
import DemoCategory from '../ng-doc.category';
import { CognitoWithMaterialComponent } from '../../../demos/cognito-with-material/cognito-with-material.component';

const CognitoWithMaterialPage: NgDocPage = {
  title: `Cognito with Material`,
  mdFile: './index.md',
  category: DemoCategory,
  imports: [CognitoWithMaterialComponent],
  playgrounds: {
    TagPlayground: {
      target: CognitoWithMaterialComponent,
      template: `<ng-doc-selector>Button</ng-doc-selector>`,
    },
  },
};

export default CognitoWithMaterialPage;
