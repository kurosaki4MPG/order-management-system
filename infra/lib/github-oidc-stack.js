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
      const standardSubject = `repo:${repositoryFullName}:environment:${environmentName}`;
      const immutableSubject = `repo:${repositoryOwner}@*/${repositoryName}@*:environment:${environmentName}`;
      const role = new iam.Role(this, `GithubActions${environmentName}Role`, {
        assumedBy: new iam.OpenIdConnectPrincipal(oidcProvider, {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
          StringLike: {
            "token.actions.githubusercontent.com:sub": [
              standardSubject,
              immutableSubject,
            ],
          },
        }),
        description: `GitHub Actions OIDC role for ${environmentName} workflows in ${repositoryFullName}`,
        maxSessionDuration: cdk.Duration.hours(1),
        roleName,
      });

      // CDK deploy で bootstrap の版数確認と publish/deploy role の引き受けができるようにする。
      role.addToPolicy(
        new iam.PolicyStatement({
          actions: ["ssm:GetParameter"],
          resources: [
            `arn:aws:ssm:${this.region}:${this.account}:parameter/cdk-bootstrap/hnb659fds/version`,
          ],
        }),
      );
      role.addToPolicy(
        new iam.PolicyStatement({
          actions: ["sts:AssumeRole"],
          resources: [
            `arn:aws:iam::${this.account}:role/cdk-hnb659fds-file-publishing-role-${this.account}-${this.region}`,
            `arn:aws:iam::${this.account}:role/cdk-hnb659fds-deploy-role-${this.account}-${this.region}`,
          ],
        }),
      );

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
