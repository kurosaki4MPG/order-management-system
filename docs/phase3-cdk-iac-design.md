# Phase 3 詳細設計書

## 1. 目的

AWS の注文バックエンドを CDK で再現可能に管理する。
このPhaseでは、DynamoDB、Lambda、API Gateway、環境分離、デプロイ方式を確定する。

対象STEP:
- STEP25 CDKプロジェクト作成
- STEP26 DynamoDBをCDKで作成
- STEP27 LambdaをCDKで作成
- STEP28 API GatewayをCDKで作成
- STEP29 環境分離
- STEP30 CDKデプロイ

---

## 2. 全体アーキテクチャ

```text
cdk.json
  -> infra/bin/app.js
  -> infra/lib/order-api-stack.js
  -> DynamoDB / Lambda / API Gateway
```

### 2.1 方針

- CDK App と Stack を分離する
- stage ベースで命名する
- dev と prod は設定を分離する
- 破壊的な削除は prod で避ける

---

## 3. スタック設計

### 3.1 Stack 名

- `OmsdevOrderApiStack`
- `OmsprodOrderApiStack`

### 3.2 context

- `stage`
- `corsOrigins`

### 3.3 環境

- region: `ap-northeast-1`
- account: `CDK_DEFAULT_ACCOUNT`

---

## 4. DynamoDB 設計

### 4.1 テーブル名

- `oms-<stage>-orders`

### 4.2 運用ポリシー

- dev: `DESTROY`
- prod: `RETAIN`

### 4.3 理由

- dev は試行錯誤しやすくする
- prod は誤削除を防ぐ

---

## 5. Lambda 設計

### 5.1 関数名

- `oms-<stage>-order-api`

### 5.2 実装

- `NodejsFunction` を利用する
- エントリポイントは `src/lambda/order-api-gateway-handler.ts`
- runtime は `nodejs22.x`

### 5.3 権限

- DynamoDB 読み書き権限を付与する

---

## 6. API Gateway 設計

### 6.1 種別

- HTTP API

### 6.2 ルート

- `/orders`
- `/orders/{id}`
- `/orders/{id}/status`

### 6.3 CORS

- dev は `http://localhost:3000`
- prod は本番フロントエンドURL

### 6.4 payload format

- Lambda 実装との互換性を保つため `VERSION_1_0`

---

## 7. 環境分離設計

### 7.1 stage 切替

- `dev`
- `prod`

### 7.2 切替対象

- リソース名
- CORS オリジン
- テーブル削除ポリシー

### 7.3 安全策

- `prod` で `corsOrigins` 未指定ならエラーにする
- prod の削除ポリシーは `RETAIN`

---

## 8. 出力設計

出力する項目:
- `Stage`
- `CorsOrigins`
- `StackName`
- `OrdersTableName`
- `OrdersTableArn`
- `OrderApiFunctionName`
- `OrderApiFunctionArn`
- `OrderApiUrl`

---

## 9. デプロイ設計

### 9.1 実行順

1. synth
2. diff
3. deploy

### 9.2 対象

- dev を先に確認する
- prod は CORS と削除ポリシーを確認してから実施する

### 9.3 失敗時

- `AccessDenied`
- `Token has expired`
- `CDKToolkit` の失敗状態

は手順書に従って確認する

---

## 10. Phase 3 の完了条件

- CDK で注文バックエンドを再現できる
- dev / prod の差分が分離されている
- 実デプロイ手順が固まっている

