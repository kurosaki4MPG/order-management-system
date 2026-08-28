const cdk = require("aws-cdk-lib");
const iam = require("aws-cdk-lib/aws-iam");

// GitHub Actions から AWS へ入るための OIDC provider と role を分離して管理する。
class GithubOidcStack extends cdk.Stack {
  constructor(scope, id, props = {}) {
    super(scope, id, props);

    const repositoryFullName =
      props.repositoryFullName ?? "kurosaki4MPG/order-management-system";
    const [repositoryOwner, repositoryName] = repositoryFullName.split("/");

    if (!repositoryOwner || !repositoryName) {
      throw new Error(
        "repositoryFullName must be formatted as <owner>/<repository>",
      );
    }

    const oidcProvider = new iam.OpenIdConnectProvider(
      this,
      "GithubActionsOidcProvider",
      {
        clientIds: ["sts.amazonaws.com"],
        url: "https://token.actions.githubusercontent.com",
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      },
    );

    const stages = [
      { environmentName: "dev", roleName: "oms-github-actions-dev" },
      { environmentName: "prod", roleName: "oms-github-actions-prod" },
    ];

    for (const { environmentName, roleName } of stages) {
      const role = new iam.Role(this, `GithubActions${environmentName}Role`, {
        assumedBy: new iam.OpenIdConnectPrincipal(oidcProvider, {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            "token.actions.githubusercontent.com:sub": `repo:${repositoryFullName}:environment:${environmentName}`,
          },
        }),
        description: `GitHub Actions OIDC role for ${environmentName} workflows in ${repositoryFullName}`,
        maxSessionDuration: cdk.Duration.hours(1),
        roleName,
      });

      new cdk.CfnOutput(this, `${environmentName}GithubActionsRoleArn`, {
        value: role.roleArn,
      });
    }

    new cdk.CfnOutput(this, "GithubActionsOidcProviderArn", {
      value: oidcProvider.openIdConnectProviderArn,
    });
  }
}

module.exports = {
  GithubOidcStack,
};
