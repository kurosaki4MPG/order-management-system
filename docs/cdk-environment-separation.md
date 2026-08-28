# STEP29 環境分離

CDK で `dev` と `prod` を分けるための手順をまとめる。

## 目的

- 開発環境と本番環境で同じコードを使いながら設定だけを切り替える
- dev では削除しやすく、prod では誤削除しにくい構成にする
- CORS の許可オリジンを環境ごとに切り替える

## 変更内容

今回の実装では以下を環境差分として扱う。

- `stage` に応じたリソース名
- DynamoDB の `removalPolicy`
- API Gateway の `allowOrigins`

## 使い方

### 1. 開発環境を synth する

```bash
npx aws-cdk synth -c stage=dev
```

dev の場合は次の値が使われる。

- テーブル名: `oms-dev-orders`
- Lambda 名: `oms-dev-order-api`
- API 名: `oms-dev-order-api`
- CORS: `http://localhost:3000`
- DynamoDB の削除ポリシー: `DESTROY`

### 2. 本番環境を synth する

```bash
npx aws-cdk synth -c stage=prod -c corsOrigins=https://app.example.com
```

prod の場合は `corsOrigins` を必ず渡す。

- テーブル名: `oms-prod-orders`
- Lambda 名: `oms-prod-order-api`
- API 名: `oms-prod-order-api`
- CORS: 指定した本番フロントエンド URL
- DynamoDB の削除ポリシー: `RETAIN`

## 実装上のポイント

- `stage` は `infra/bin/app.js` で CDK context から読む
- `corsOrigins` も context で受け取り、カンマ区切りの文字列を配列へ変換する
- `prod` で `corsOrigins` が無い場合はエラーにして、誤った設定での deploy を防ぐ

## 実運用での注意

- dev と prod はできれば別アカウント、少なくとも別スタック名で運用する
- prod の CORS は `http://localhost:3000` のままにしない
- prod の DynamoDB は `DESTROY` にしない
- 環境ごとの値は将来的に `cdk.json` や環境変数、SSM Parameter Store に寄せてもよい

## 関連ファイル

- `infra/bin/app.js`
- `infra/lib/order-api-stack.js`
- `docs/order-system-learning-context.md`

