# Order Management System

注文管理システムを題材にした、Next.js + AWS サーバーレス構成の学習プロジェクトです。  
フロントエンド、API、非同期処理、帳票出力、認証、監視、CI/CD までを一通り扱います。

## 概要

- フロントエンド: Next.js
- バックエンド: API Gateway / Lambda / DynamoDB / EventBridge / SQS / Step Functions
- 帳票: React PDF / S3 / signed URL
- 認証: Cognito
- 監視: CloudWatch
- IaC: AWS CDK

## 主要な入口

- [学習コンテキスト](docs/order-system-learning-context.md)
- [Phase インデックス](docs/phase-index.md)
- [詳細設計インデックス](docs/detailed-design/design-index.md)
- [詳細設計書](docs/detailed-design/order-management-system-detailed-design.md)
- [画面設計書](docs/detailed-design/order-management-system-screen-design.md)
- [API設計書](docs/detailed-design/order-management-system-api-design.md)
- [AWS設計書](docs/detailed-design/order-management-system-aws-design.md)
- [Phase 9 最終統合](docs/phase9-final-integration.md)

## ローカル起動

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## よく使うコマンド

```bash
npm run lint
npm run test
npm run test:coverage
npm run build
npm run test:e2e
npm run test:e2e:coverage
npm run verify:ci
```

## 開発時の注意

- 認証が必要な画面は Cognito のセッションが必要です。
- AWS 実地確認は `oms-dev` などの正しい profile とリージョン設定が必要です。
- STEP77 以降は CloudWatch / Step Functions / SQS / DLQ / Lambda の実機確認手順を各 STEP にまとめています。

## ドキュメントの見方

1. まず [Phase インデックス](docs/phase-index.md) で全体の流れを確認します。
2. 次に [詳細設計インデックス](docs/detailed-design/design-index.md) で設計の入口を確認します。
3. 実施結果や学習メモは [学習コンテキスト](docs/order-system-learning-context.md) で辿ります。
4. 個別の操作手順は各 `phase*-*.md` を参照します。詳細設計は `docs/detailed-design/` の統合文書を参照します。

## デプロイと運用

- AWS CDK のデプロイ手順は [cdk-deploy-guide.md](docs/cdk-deploy-guide.md) を参照してください。
- 環境分離やローカル変数は [cdk-environment-separation.md](docs/cdk-environment-separation.md) と [local-environment-variables.md](docs/local-environment-variables.md) を参照してください。
- AWS 構成は [AWS設計書](docs/detailed-design/order-management-system-aws-design.md) を参照してください。

## 学習の位置づけ

このリポジトリは、実務レベルの注文管理システムを段階的に作るための教材です。  
各 Phase は機能追加だけでなく、テスト、設計、運用、障害対応まで含めて確認する前提で進めています。
