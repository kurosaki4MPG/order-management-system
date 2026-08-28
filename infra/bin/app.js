#!/usr/bin/env node

const cdk = require("aws-cdk-lib");

const { OrderApiStack } = require("../lib/order-api-stack");
const { GithubOidcStack } = require("../lib/github-oidc-stack");

// stage と CORS の入力だけを受け取り、同じスタック定義を環境別に再利用する。
const app = new cdk.App();
const stage = app.node.tryGetContext("stage") ?? "dev";
const corsOriginsContext = app.node.tryGetContext("corsOrigins");

function normalizeCorsOrigins(value) {
  if (Array.isArray(value)) {
    return value.map((origin) => String(origin).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return undefined;
}

const corsOrigins = normalizeCorsOrigins(corsOriginsContext);

new OrderApiStack(app, `Oms${stage}OrderApiStack`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1",
  },
  corsOrigins,
  stage,
});

new GithubOidcStack(app, "OmsGithubOidcStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1",
  },
  repositoryFullName: "kurosaki4MPG/order-management-system",
});
