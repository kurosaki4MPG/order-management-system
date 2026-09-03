# 注文管理システム 詳細設計書

この文書は、`order-management-system` の提出用詳細設計書である。  
画面、API、AWS の詳細仕様は個別の副文書に分割し、本書は全体方針、各文書の役割、横断観点の整理としてまとめる。

---

## 1. 文書情報

| 項目 | 内容 |
| --- | --- |
| 文書名 | 注文管理システム 詳細設計書 |
| 文書番号 | `OMS-DD-001` |
| 対象システム | Order Management System |
| 対象範囲 | Phase 1 〜 Phase 9 |
| 作成日 | 2026-09-02 |
| 作成者 | Codex |
| レビュー担当 | 開発担当 / 運用担当 |
| 承認者 | プロジェクト責任者 |
| 版数 | v1.0 |

### 1.1 改訂履歴

| 版数 | 日付 | 変更内容 | 変更者 |
| --- | --- | --- | --- |
| v1.0 | 2026-09-02 | 主文書として再整理。詳細は画面/API/AWS の各文書へ分離 | Codex |

### 1.2 参照資料

- [詳細設計書インデックス](./design-index.md)
- [学習コンテキスト](../order-system-learning-context.md)

---

## 2. 目的・適用範囲

### 2.1 目的

- 注文管理システム全体の設計方針を一本化する
- 画面、API、AWS の責務分担と参照先を明確にする
- Phase ごとの作業内容を提出用の体系で追跡できるようにする

### 2.2 適用範囲

- フロントエンドの画面設計は [画面設計書](./order-management-system-screen-design.md) に記載する
- API 契約とデータ形式は [API設計書](./order-management-system-api-design.md) に記載する
- AWS リソース、権限、監視、非同期処理は [AWS設計書](./order-management-system-aws-design.md) に記載する

### 2.3 前提条件

- 認証は Cognito Hosted UI とセッション管理を前提とする
- 永続化は DynamoDB を前提とする
- 非同期処理は EventBridge、SQS / DLQ、Step Functions を前提とする
- 帳票は React PDF で生成し、S3 と signed URL で配布する
- 監視は CloudWatch アラームと Logs Insights を前提とする

---

## 3. システム概要

### 3.1 背景

注文管理システムでは、注文登録、更新、請求書生成、通知、監視を一貫して扱う必要がある。  
本リポジトリでは、画面・API・AWS を分離した設計書を用意し、実装と運用を追跡しやすい構成にしている。

### 3.2 設計の考え方

- 画面仕様は UI と導線に集中させる
- API 設計は入力・出力・認証・エラーに集中させる
- AWS 設計はリソース、権限、監視、障害対応に集中させる
- 本書は、各設計書を束ねる案内役として扱う

### 3.3 全体の関係

- 画面の整理先: [画面設計書](./order-management-system-screen-design.md)
- API の整理先: [API設計書](./order-management-system-api-design.md)
- AWS の整理先: [AWS設計書](./order-management-system-aws-design.md)

---

## 4. 責務分担

| 文書 | 主な責務 |
| --- | --- |
| 詳細設計書 | 全体方針、各設計書の役割、横断参照 |
| 画面設計書 | 画面レイアウト、操作、遷移、モック |
| API設計書 | API 契約、データ形式、認証、エラー |
| AWS設計書 | AWS 構成、命名、権限、監視、障害対応 |

---

## 5. 機能の見取り図

| ID | 機能名 | 主な参照先 |
| --- | --- | --- |
| F-001 | 注文一覧表示 | [画面設計書](./order-management-system-screen-design.md)、[API設計書](./order-management-system-api-design.md) |
| F-002 | 注文登録 | [画面設計書](./order-management-system-screen-design.md)、[API設計書](./order-management-system-api-design.md) |
| F-003 | 注文詳細 | [画面設計書](./order-management-system-screen-design.md)、[API設計書](./order-management-system-api-design.md) |
| F-004 | 注文更新 | [画面設計書](./order-management-system-screen-design.md)、[API設計書](./order-management-system-api-design.md) |
| F-005 | 注文削除 | [画面設計書](./order-management-system-screen-design.md)、[API設計書](./order-management-system-api-design.md) |
| F-006 | ステータス更新 | [画面設計書](./order-management-system-screen-design.md)、[API設計書](./order-management-system-api-design.md) |
| F-007 | 請求書プレビュー | [画面設計書](./order-management-system-screen-design.md) |
| F-008 | 請求書生成 | [API設計書](./order-management-system-api-design.md) |
| F-009 | S3 保存 | [API設計書](./order-management-system-api-design.md)、[AWS設計書](./order-management-system-aws-design.md) |
| F-010 | 署名付き URL | [API設計書](./order-management-system-api-design.md) |
| F-011 | 注文処理ワークフロー | [AWS設計書](./order-management-system-aws-design.md) |
| F-012 | 通知 | [AWS設計書](./order-management-system-aws-design.md) |

---

## 6. 画面設計

画面設計に関する詳細は [画面設計書](./order-management-system-screen-design.md) を参照。

- ダッシュボード
- 注文一覧
- 注文登録
- 注文詳細
- PDF プレビュー
- ログイン
- 権限なし

---

## 7. API設計

API 設計に関する詳細は [API設計書](./order-management-system-api-design.md) を参照。

- `/api/orders`
- `/api/orders/[id]`
- `/api/orders/[id]/status`
- `/api/pdf/invoice`
- `/api/pdf/invoice/store`
- `/api/pdf/invoice/signed-url`
- `/api/auth/login`
- `/api/auth/callback`
- `/api/auth/logout`

---

## 8. AWS設計

AWS 設計に関する詳細は [AWS設計書](./order-management-system-aws-design.md) を参照。

- DynamoDB
- API Gateway
- Lambda
- EventBridge
- SQS / DLQ
- Step Functions
- S3
- CloudWatch
- Cognito
- IAM

---

## 9. データ・イベント・運用の扱い

- データ設計は API 設計書と AWS 設計書に分担する
- イベント設計は AWS 設計書に集約する
- 運用・保守の観点は AWS 設計書を正とする
- テスト観点は画面設計書、API 設計書、AWS 設計書の各節を参照する
- 注文 ID と請求書番号の末尾ルールのような横断的な命名は、関連設計書間で同じ前提を共有する

---

## 10. 付録

### 10.1 主要ファイル

- `src/app/orders/page.tsx`
- `src/app/orders/new/page.tsx`
- `src/app/orders/[id]/page.tsx`
- `src/app/pdf-preview/page.tsx`
- `src/app/api/orders/route.ts`
- `src/app/api/pdf/invoice/route.ts`
- `src/lambda/order-workflow-handler.ts`
- `src/lambda/order-invoice-generation-handler.ts`
- `infra/lib/order-api-stack.js`
