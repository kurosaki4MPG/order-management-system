# STEP25 CDKプロジェクト作成

この手順書は、Phase 3 の最初の作業として CDK プロジェクトの土台を確認し、以降の DynamoDB / Lambda / API Gateway を CDK で扱える状態にするための実施手順である。

このリポジトリでは、CDK の入口ファイルはすでに用意済みである。新規作成ではなく、現状確認と不足時の補完を行う。

## 目的

- CDK のエントリポイントを固定する
- Stack の実装場所を `infra/` に整理する
- `synth` が通る最小構成を確認する
- 以降の STEP26 以降で同じ入口から IaC を拡張できる状態にする

## 前提

- Node.js と npm が利用可能
- AWS CLI と `oms-dev` プロファイルが利用可能
- `cdk bootstrap` が完了している、または後続作業前に完了させる

## 1. 現状確認

最初に、CDK の基本ファイルが揃っているか確認する。

```bash
rg --files | rg '(^|/)cdk\\.json$|^infra/bin/app\\.js$|^infra/lib/order-api-stack\\.js$'
```

期待値:

- `cdk.json`
- `infra/bin/app.js`
- `infra/lib/order-api-stack.js`

次に `cdk.json` の内容を確認する。

```bash
sed -n '1,40p' cdk.json
```

期待値:

- `"app": "node infra/bin/app.js"` になっている

## 2. CDK入口の確認

`infra/bin/app.js` を確認する。

```bash
sed -n '1,200p' infra/bin/app.js
```

確認ポイント:

- `cdk.App()` を生成している
- `stage` を context から読んでいる
- `corsOrigins` を context から読んでいる
- `new OrderApiStack(...)` を呼んでいる

## 3. Stack実装の確認

`infra/lib/order-api-stack.js` を確認する。

```bash
sed -n '1,260p' infra/lib/order-api-stack.js
```

確認ポイント:

- `OrderApiStack` が定義されている
- DynamoDB / Lambda / API Gateway を同じ Stack で扱える
- `stage` に応じて名前が変わる
- `CDK_DEFAULT_ACCOUNT` と `CDK_DEFAULT_REGION` を使う

## 4. 依存関係の確認

CDK の実行に必要な依存が入っているか確認する。

```bash
node -p "require('./package.json').devDependencies['aws-cdk-lib']"
node -p "require('./package.json').devDependencies.constructs"
node -p "require('./package.json').devDependencies.esbuild"
```

期待値:

- `aws-cdk-lib` が入っている
- `constructs` が入っている
- `esbuild` が入っている

## 5. synth確認

`dev` ステージで synth を実行する。

```bash
npx aws-cdk synth -c stage=dev
```

確認ポイント:

- エラーなく合成できる
- `cdk.out` が生成される

## 6. diff確認

実際の差分を確認する。

```bash
npx aws-cdk diff -c stage=dev
```

確認ポイント:

- 何が作成されるか分かる
- 意図しないリソースが混ざっていない

## 7. 必要なら bootstrap

まだ bootstrap していない環境だけ実施する。

```bash
npx aws-cdk bootstrap aws://686910912663/ap-northeast-1 --profile oms-dev
```

確認ポイント:

- `CDKToolkit` が正常に存在する
- `DELETE_FAILED` や `AccessDenied` が出ない

## 8. 完了条件

次の条件を満たせば STEP25 は完了とみなす。

- `cdk.json` の入口が `node infra/bin/app.js` になっている
- `infra/bin/app.js` から Stack を起動できる
- `infra/lib/order-api-stack.js` に CDK 実装の土台がある
- `npx aws-cdk synth -c stage=dev` が成功する
- `npx aws-cdk diff -c stage=dev` が確認できる

## 9. 次のSTEP

STEP25 が完了したら、STEP26 で DynamoDB を CDK から作成する。
