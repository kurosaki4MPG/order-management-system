# STEP28 API GatewayをCDKで作成

このステップでは、Lambda と DynamoDB の上に HTTP API を CDK で構築する。

## 目的

- `oms-dev-order-api` を HTTP API として公開する
- `/orders` 系のルートを CDK で作る
- CORS を `http://localhost:3000` に対して許可する

## 実装方針

HTTP API を使う。

理由:

- 設定が軽い
- Lambda proxy integration と相性が良い
- 今回の注文APIでは REST API の追加機能をまだ必要としない

## CDK実装

`infra/lib/order-api-stack.js` に次を追加する。

```js
const apigwv2 = require("aws-cdk-lib/aws-apigatewayv2");
const apigwv2Integrations = require("aws-cdk-lib/aws-apigatewayv2-integrations");

const orderApi = new apigwv2.HttpApi(this, "OrderHttpApi", {
  apiName: `oms-${stage}-order-api`,
  corsPreflight: {
    allowHeaders: ["Content-Type", "X-Request-Id"],
    allowMethods: [
      apigwv2.CorsHttpMethod.DELETE,
      apigwv2.CorsHttpMethod.GET,
      apigwv2.CorsHttpMethod.OPTIONS,
      apigwv2.CorsHttpMethod.PATCH,
      apigwv2.CorsHttpMethod.POST,
    ],
    allowOrigins: ["http://localhost:3000"],
  },
});
```

### Lambda integration

Lambda 側は `httpMethod` と `path` を読む実装なので、payload format は `1.0` を使う。

```js
const orderApiIntegration = new apigwv2Integrations.HttpLambdaIntegration(
  "OrderApiIntegration",
  orderApiFunction,
  {
    payloadFormatVersion: apigwv2.PayloadFormatVersion.VERSION_1_0,
  }
);
```

### ルート

```js
orderApi.addRoutes({
  integration: orderApiIntegration,
  methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
  path: "/orders",
});

orderApi.addRoutes({
  integration: orderApiIntegration,
  methods: [
    apigwv2.HttpMethod.GET,
    apigwv2.HttpMethod.PATCH,
    apigwv2.HttpMethod.DELETE,
  ],
  path: "/orders/{id}",
});

orderApi.addRoutes({
  integration: orderApiIntegration,
  methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PATCH],
  path: "/orders/{id}/status",
});
```

### 出力

```js
new cdk.CfnOutput(this, "OrderApiUrl", {
  value: orderApi.apiEndpoint,
});
```

## 実行確認

### 合成

```bash
npx aws-cdk synth
```

### 差分

```bash
npx aws-cdk diff
```

## デプロイ

```bash
npx aws-cdk deploy --profile oms-dev
```

## 確認

デプロイ後は次を確認する。

```bash
aws apigatewayv2 get-api \
  --api-id <api-id> \
  --region ap-northeast-1 \
  --profile oms-dev
```

```bash
aws apigatewayv2 get-routes \
  --api-id <api-id> \
  --region ap-northeast-1 \
  --profile oms-dev
```

```bash
curl -i "$API_BASE_URL/orders"
```

## このステップの到達点

- HTTP API が CDK で作成される
- `/orders` 系のルートが Lambda に接続される
- 次の STEP29 で環境分離を扱える

