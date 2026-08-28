# Phase 6 詳細設計書

## 1. 目的

注文管理システム全体の品質をテストで担保する。
単体テスト、コンポーネントテスト、統合テスト、E2E を役割分担して設計する。

対象STEP:
- STEP46 テスト方針策定
- STEP47 Vitest導入
- STEP48 スキーマ・ユーティリティテスト
- STEP49 Reactコンポーネントテスト
- STEP50 TanStack Queryテスト
- STEP51 Lambda単体テスト
- STEP52 モック戦略
- STEP53 統合テスト
- STEP54 E2Eテスト
- STEP55 カバレッジ・品質基準

### 1.1 STEP と実ファイルの対応表

| STEP | 主な内容 | 実ファイル |
| --- | --- | --- |
| STEP46 | テスト方針策定 | 設計のみ |
| STEP47 | Vitest 導入 | [`vitest.config.mts`](../vitest.config.mts), [`src/test/setup.ts`](../src/test/setup.ts), [`package.json`](../package.json) |
| STEP48 | スキーマ・ユーティリティテスト | [`src/features/orders/schemas/order-schema.test.ts`](../src/features/orders/schemas/order-schema.test.ts), [`src/features/orders/utils/order-formatters.test.ts`](../src/features/orders/utils/order-formatters.test.ts), [`src/features/pdf/invoice-artifacts.server.test.ts`](../src/features/pdf/invoice-artifacts.server.test.ts), [`src/features/pdf/invoice-order.server.test.ts`](../src/features/pdf/invoice-order.server.test.ts) |
| STEP49 | React コンポーネントテスト | [`src/features/orders/components/order-form.test.tsx`](../src/features/orders/components/order-form.test.tsx), [`src/features/orders/components/order-list.test.tsx`](../src/features/orders/components/order-list.test.tsx), [`src/features/orders/components/order-detail.test.tsx`](../src/features/orders/components/order-detail.test.tsx), [`src/features/orders/components/order-status-manager.test.tsx`](../src/features/orders/components/order-status-manager.test.tsx), [`src/features/orders/components/order-status-badge.test.tsx`](../src/features/orders/components/order-status-badge.test.tsx), [`src/features/pdf/pdf-preview-panel.test.tsx`](../src/features/pdf/pdf-preview-panel.test.tsx) |
| STEP50 | TanStack Query テスト | [`src/features/orders/api/order-queries.test.tsx`](../src/features/orders/api/order-queries.test.tsx) |
| STEP51 | Lambda 単体テスト | [`src/lambda/order-create-handler.test.ts`](../src/lambda/order-create-handler.test.ts), [`src/lambda/order-get-handler.test.ts`](../src/lambda/order-get-handler.test.ts), [`src/lambda/order-update-delete-handler.test.ts`](../src/lambda/order-update-delete-handler.test.ts), [`src/lambda/order-workflow-handler.test.ts`](../src/lambda/order-workflow-handler.test.ts) |
| STEP52 | モック戦略 | 各テストでの `vi.mock` / `vi.hoisted` / `fetch` モック |
| STEP53 | 統合テスト | [`src/features/orders/services/order-service.integration.test.ts`](../src/features/orders/services/order-service.integration.test.ts) |
| STEP54 | E2E テスト | [`playwright.config.ts`](../playwright.config.ts), [`e2e/order-registration.spec.ts`](../e2e/order-registration.spec.ts), [`e2e/pdf-preview.spec.ts`](../e2e/pdf-preview.spec.ts) |
| STEP55 | カバレッジ・品質基準 | [`vitest.config.mts`](../vitest.config.mts) |

---

## 2. テスト方針

### 2.1 基本原則

- 純粋ロジックは必ずテストする
- UI は主要分岐をテストする
- AWS 依存はモックする
- E2E は重要業務フローに絞る
- 失敗したときに原因が一意に絞れる粒度で分ける
- 高コストな AWS 実リソースは単体テストから切り離す

### 2.2 レイヤ別

| 対象 | テスト種別 |
| --- | --- |
| Zod スキーマ | 単体テスト |
| 金額計算 | 単体テスト |
| UI コンポーネント | コンポーネントテスト |
| React Query hooks | hooks / integration |
| Lambda handler | 単体テスト |
| Service + Repository | 統合テスト |
| フロントからAPIまで | E2E |

---

## 2.3 このプロジェクトでの境界

- 注文データは DynamoDB に保存するが、テストでは Repository を差し替える
- 請求書 PDF は React PDF の出力結果を検証し、S3 保存は別途契約レベルで確認する
- Step Functions はワークフローの入力・出力・失敗分岐を検証し、AWS コンソールの操作自体はテストしない
- 画面テストは Next.js のレンダリングと UI 状態に限定する

---

## 3. Vitest 設計

- Vite 系の開発体験を使う
- テスト実行を高速にする
- モックとスナップショットを使い分ける
- `test` / `test:watch` / `test:coverage` の実行経路を分ける
- Node 環境と jsdom 環境を用途別に分離する

---

## 4. スキーマ・ユーティリティテスト

### 対象

- 注文登録スキーマ
- 注文更新スキーマ
- 金額計算
- 形式変換
- 請求書のデータ整形
- ワークフロー入力のアサーション

### 観点

- 境界値
- 不正値
- 空配列
- 数量と単価の計算
- 日付フォーマット
- ID とキーの組み立て

---

## 5. React コンポーネントテスト

### 対象

- 一覧
- 登録フォーム
- 詳細表示
- 編集フォーム
- PDF プレビュー
- 保存・ダウンロード導線
- 画面表示
- レイアウト崩れの起点になる DOM 構造
- 状態ごとの見た目の差分

### 観点

- ボタン表示
- バリデーション表示
- ローディング
- エラー表示
- 選択状態
- 空データ時のメッセージ
- 主要セクションの配置
- テーブルやカードの見出し表示
- レスポンシブ時に崩れやすい分岐
- 選択時の視覚的な強調

### 5.1 画面表示・レイアウトの確認方針

- コンポーネントテストでは、文字列の有無だけでなく主要セクションが描画されることを確認する
- `class` の変化や `disabled` 状態など、表示に直結する属性も確認対象に含める
- PDF プレビューは実 PDF のレンダリングではなく、注文選択と iframe の URL / サイズ制御を確認する
- ブラウザ幅依存の崩れは、必要に応じて Playwright の E2E で確認する

### 5.2 該当テストファイル

- [`src/features/orders/components/order-form.test.tsx`](../src/features/orders/components/order-form.test.tsx)
- [`src/features/orders/components/order-list.test.tsx`](../src/features/orders/components/order-list.test.tsx)
- [`src/features/orders/components/order-detail.test.tsx`](../src/features/orders/components/order-detail.test.tsx)
- [`src/features/pdf/pdf-preview-panel.test.tsx`](../src/features/pdf/pdf-preview-panel.test.tsx)

### 5.3 観点別の整理

| 区分 | 主な確認内容 | テストファイル |
| --- | --- | --- |
| 表示確認 | セクション見出し、テーブル見出し、ボタン、エラー文言、空状態文言 | [`order-form.test.tsx`](../src/features/orders/components/order-form.test.tsx), [`order-list.test.tsx`](../src/features/orders/components/order-list.test.tsx), [`order-detail.test.tsx`](../src/features/orders/components/order-detail.test.tsx), [`pdf-preview-panel.test.tsx`](../src/features/pdf/pdf-preview-panel.test.tsx) |
| レイアウト確認 | 主要セクションの配置、カード構成、テーブル構造、PDF プレビュー枠の比率と iframe 属性 | [`order-form.test.tsx`](../src/features/orders/components/order-form.test.tsx), [`order-list.test.tsx`](../src/features/orders/components/order-list.test.tsx), [`order-detail.test.tsx`](../src/features/orders/components/order-detail.test.tsx), [`pdf-preview-panel.test.tsx`](../src/features/pdf/pdf-preview-panel.test.tsx) |
| 機能確認 | フォーム送信、検索・絞り込み、削除、詳細遷移、プレビュー更新、保存導線 | [`order-form.test.tsx`](../src/features/orders/components/order-form.test.tsx), [`order-list.test.tsx`](../src/features/orders/components/order-list.test.tsx), [`order-detail.test.tsx`](../src/features/orders/components/order-detail.test.tsx), [`pdf-preview-panel.test.tsx`](../src/features/pdf/pdf-preview-panel.test.tsx) |

### 5.4 具体的なテストケース

#### 表示確認

- [`order-form.test.tsx`](../src/features/orders/components/order-form.test.tsx)
  - `renders the main form sections and actions`
  - `shows validation errors when submitted empty`
  - `shows a validation message when the API returns 400`
  - `shows a generic error when the mutation fails unexpectedly`
- [`order-list.test.tsx`](../src/features/orders/components/order-list.test.tsx)
  - `renders the main list sections and table headers`
  - `shows an empty message when no orders match`
  - `shows a loading skeleton while the list is fetching`
  - `shows a stale-data warning when refetch fails`
- [`order-detail.test.tsx`](../src/features/orders/components/order-detail.test.tsx)
  - `renders the main detail sections and cards`
  - `shows a loading skeleton while the order is being fetched`
  - `shows a not-found message when the order is missing`
- [`pdf-preview-panel.test.tsx`](../src/features/pdf/pdf-preview-panel.test.tsx)
  - `renders the preview frame with the expected layout structure`
  - `shows an error message when loading orders fails`

#### レイアウト確認

- [`order-form.test.tsx`](../src/features/orders/components/order-form.test.tsx)
  - `renders the main form sections and actions`
- [`order-list.test.tsx`](../src/features/orders/components/order-list.test.tsx)
  - `renders the main list sections and table headers`
- [`order-detail.test.tsx`](../src/features/orders/components/order-detail.test.tsx)
  - `renders the main detail sections and cards`
- [`pdf-preview-panel.test.tsx`](../src/features/pdf/pdf-preview-panel.test.tsx)
  - `renders the preview frame with the expected layout structure`

#### 機能確認

- [`order-form.test.tsx`](../src/features/orders/components/order-form.test.tsx)
  - `submits a valid order and shows success feedback`
  - `disables the submit button while the mutation is pending`
- [`order-list.test.tsx`](../src/features/orders/components/order-list.test.tsx)
  - `renders orders and updates filters before deleting an order`
- [`order-detail.test.tsx`](../src/features/orders/components/order-detail.test.tsx)
  - `renders an order detail and navigates back after deleting`
- [`pdf-preview-panel.test.tsx`](../src/features/pdf/pdf-preview-panel.test.tsx)
  - `loads orders and keeps the preview actions in sync with the selected order`

---

## 6. TanStack Query テスト

- fetch 成功時のデータ更新
- エラー時の挙動
- mutation 後の invalidate
- 詳細画面と一覧画面の再取得
- API ベース URL の切り替え

### 6.1 該当テストファイル

- [`src/features/orders/api/order-queries.test.tsx`](../src/features/orders/api/order-queries.test.tsx)

### 6.2 具体的なテストケース

- `fetches orders with normalized filters`
- `surfaces errors when fetching orders fails`
- `fetches a single order detail`
- `fetches the current order status`
- `surfaces errors when fetching order status fails`
- `invalidates cached order queries after creating an order`
- `invalidates cached order queries after updating an order status`
- `removes detail cache and invalidates lists after deleting an order`

---

## 7. Lambda 単体テスト

### 対象

- 登録
- 取得
- 更新
- 削除
- ステータス変更
- 請求書生成ワークフロー
- S3 保存と署名付き URL 生成

### 観点

- HTTP レスポンス形式
- バリデーションエラー
- 404
- 500
- 必須環境変数不足時の失敗
- 注文未存在時の失敗

### 7.1 該当テストファイル

- [`src/lambda/order-create-handler.test.ts`](../src/lambda/order-create-handler.test.ts)
- [`src/lambda/order-get-handler.test.ts`](../src/lambda/order-get-handler.test.ts)
- [`src/lambda/order-update-delete-handler.test.ts`](../src/lambda/order-update-delete-handler.test.ts)
- [`src/lambda/order-workflow-handler.test.ts`](../src/lambda/order-workflow-handler.test.ts)

### 7.2 具体的なテストケース

#### 登録

- `creates an order and returns a 201 response`
- `rejects invalid order payloads with a 400 response`
- `returns 405 for unsupported methods`

#### 取得

- `returns an order list for collection paths`
- `returns a single order for detail paths`
- `returns 404 when the order does not exist`
- `returns 400 when no order id is available`
- `returns 405 for non-GET methods`

#### 更新 / 削除

- `updates order status with PATCH`
- `updates the full order payload with PATCH`
- `returns 404 when the target order does not exist`
- `returns 400 for invalid PATCH payloads`
- `deletes an order with DELETE`
- `returns 405 for unsupported methods`

#### ワークフロー

- `throws when required workflow fields are missing`
- `returns a completed prepare step`
- `throws a simulated failure when shouldFail is enabled`
- `keeps prepareCompletedAt on finalize steps`

---

## 8. モック戦略

- モックは境界に置き、テスト対象の責務を越えさせない
- UI テストは Query hook をモックし、画面分岐だけを確認する
- TanStack Query テストは API 関数をモックし、`QueryClient` の invalidate / remove を確認する
- Lambda 単体テストは Service / Repository / AWS SDK をモックし、HTTP 契約だけを確認する
- Repository テスト以外では DynamoDB の実接続を使わない
- EventBridge / Step Functions / S3 / SNS はユニット境界でスタブ化する
- `vi.mock` の hoist に注意し、必要なモックは `vi.hoisted` で初期化する
- 各テストは `mockReset` / `clearAllMocks` / env の後始末を必ず行う

### 8.1 該当テストファイル

- [`src/features/orders/components/order-form.test.tsx`](../src/features/orders/components/order-form.test.tsx)
- [`src/features/orders/components/order-list.test.tsx`](../src/features/orders/components/order-list.test.tsx)
- [`src/features/orders/components/order-detail.test.tsx`](../src/features/orders/components/order-detail.test.tsx)
- [`src/features/pdf/pdf-preview-panel.test.tsx`](../src/features/pdf/pdf-preview-panel.test.tsx)
- [`src/features/orders/api/order-queries.test.tsx`](../src/features/orders/api/order-queries.test.tsx)
- [`src/lambda/order-create-handler.test.ts`](../src/lambda/order-create-handler.test.ts)
- [`src/lambda/order-get-handler.test.ts`](../src/lambda/order-get-handler.test.ts)
- [`src/lambda/order-update-delete-handler.test.ts`](../src/lambda/order-update-delete-handler.test.ts)
- [`src/lambda/order-workflow-handler.test.ts`](../src/lambda/order-workflow-handler.test.ts)
- [`src/features/pdf/invoice-artifacts.server.test.ts`](../src/features/pdf/invoice-artifacts.server.test.ts)
- [`src/features/pdf/invoice-order.server.test.ts`](../src/features/pdf/invoice-order.server.test.ts)
- [`src/features/orders/services/order-service.integration.test.ts`](../src/features/orders/services/order-service.integration.test.ts)

### 8.2 具体的なモックの使い分け

- UI コンポーネントは `useOrdersQuery` / `useOrderQuery` / `useDeleteOrderMutation` / `useUpdateOrderStatusMutation` を差し替える
- TanStack Query テストは `fetchOrders` / `fetchOrder` / `fetchOrderStatus` / `createOrder` / `updateOrderStatus` / `deleteOrder` を差し替える
- Lambda テストは `order-service` を差し替え、HTTP 契約だけを検証する
- PDF 系テストは `order-service` や S3 保存処理を境界で止める
- 統合テストは Repository 実装を通すが、AWS SDK はモックして DynamoDB 実接続を避ける
- EventBridge / Step Functions / S3 / SNS は、単体テストでは SDK モックで止める

### 8.3 代表的な確認ケース

- `shows validation errors when submitted empty`
- `renders orders and updates filters before deleting an order`
- `renders an order detail and navigates back after deleting`
- `loads orders and keeps the preview actions in sync with the selected order`
- `fetches orders with normalized filters`
- `invalidates cached order queries after deleting an order`
- `creates an order and returns a 201 response`
- `returns an order list for collection paths`
- `updates order status with PATCH`
- `creates and retrieves an order through the repository`

---

## 9. 統合テスト

- Service と Repository の結合を確認する
- 保存後の再取得
- 更新後の整合性
- 削除後の未存在確認
- DynamoDB の実接続は E2E ではなく統合テストに寄せる
- Repository 実装は AWS SDK をモックしたうえで通し、Service からの呼び出し経路を確認する
- 代表的な成功系に加えて、更新・削除の反映結果も確認する

### 9.1 該当テストファイル

- [`src/features/orders/services/order-service.integration.test.ts`](../src/features/orders/services/order-service.integration.test.ts)

### 9.2 具体的なテストケース

- `creates and retrieves an order through the repository`
- `filters orders through searchOrders`
- `updates order status and keeps other fields intact`
- `updates the full order payload and recalculates totals`
- `deletes an order and makes it unavailable`

---

## 10. E2E テスト

- 注文登録
- 注文一覧表示
- 注文詳細表示
- 注文編集
- 注文削除
- 請求書プレビュー
- 請求書保存と署名付き URL の取得
- 画面全体の表示崩れ確認
- 主要レイアウトの縦横比や余白の確認
- ブラウザ E2E は AWS 実接続に依存しないよう、必要な API は Playwright の route でモックする
- 画面遷移と主要な表示変化だけを確認し、PDF の描画そのものは別レイヤーで確認する
- 既存の `.env.local` が API Gateway を指していても、E2E では route モックで契約を固定する
- E2E の coverage は Chromium の `page.coverage` を使った bundle-level の出力に限定する
- 出力先は `.playwright-coverage/report` にまとめる
- `index.html` は生成せず、確認対象は `coverage-summary.json` と `case-summary.md` に絞る

### 10.1 該当テストファイル

- [`e2e/order-registration.spec.ts`](../e2e/order-registration.spec.ts)
- [`e2e/pdf-preview.spec.ts`](../e2e/pdf-preview.spec.ts)

### 10.2 具体的なテストケース

#### 注文登録

- `注文登録フォームから注文を作成できる`
- `注文登録フォームは空送信時に入力エラーを表示する`
- `注文登録フォームはサーバー失敗時に一般エラーを表示する`

#### PDF プレビュー

- `PDF プレビューで注文を切り替え、生成 URL を確認できる`
- `PDF プレビューは注文一覧の取得失敗を表示する`

### 10.3 coverage 出力

- [`scripts/run-e2e-coverage.mjs`](../scripts/run-e2e-coverage.mjs)
- [`scripts/collect-e2e-coverage.mjs`](../scripts/collect-e2e-coverage.mjs)
- `npm run test:e2e:coverage`
- coverage 集計は Playwright の raw から `[project]/src/` を含むアプリ本体の chunk に限定する
- Next.js runtime、HMR、next-devtools は集計対象から除外する
- E2E coverage のレポートは `coverage-summary.json` と `case-summary.md` を主成果物として扱う
- raw の JSON は中間生成物として集計後に削除する
- raw を残したい場合は `PLAYWRIGHT_E2E_COVERAGE_KEEP_RAW=1` を使う
- `case-summary.md` は相対パスの Test File、Test Case、Result、Error のみを表示する

---

## 11. 品質基準

- 必須ロジックは単体テストを持つ
- 画面の重要分岐はコンポーネントテストを持つ
- 主要フローは E2E で確認する
- テストの失敗理由が追えること
- AWS 実リソース依存の手動確認は最小限に抑える
- Vitest の基準は Statements 80%、Lines 80%、Functions 80%、Branches 70% を下限にする
- E2E は `playwright test` で個別に通す
- `test:coverage` は品質基準のゲートとして扱う

### 11.1 100% に届いていない理由

`test:coverage` は基準を満たしているが、以下のファイルは 100% まで追っていない。

- [`src/features/orders/api/order-queries.ts`](../src/features/orders/api/order-queries.ts)
  - React Query の取得・更新・無効化に集中しており、分岐は少ないため
- [`src/features/orders/components/order-detail.tsx`](../src/features/orders/components/order-detail.tsx)
  - 詳細表示の主要導線は確認済みで、補助的な表示分岐を 100% までは追っていないため
- [`src/features/orders/components/order-form.tsx`](../src/features/orders/components/order-form.tsx)
  - 入力・送信・エラー表示の主要経路は確認済みで、フォーム補助の細かな分岐を 100% までは追っていないため
- [`src/features/orders/components/order-list.tsx`](../src/features/orders/components/order-list.tsx)
  - 一覧表示と空状態は確認済みで、補助表示や装飾の分岐を 100% までは追っていないため
- [`src/features/orders/components/order-status-manager.tsx`](../src/features/orders/components/order-status-manager.tsx)
  - 状態更新の主要経路は確認済みで、補助的な表示分岐を 100% までは追っていないため
- [`src/features/orders/repositories/dynamo-db-order-repository.ts`](../src/features/orders/repositories/dynamo-db-order-repository.ts)
  - 実データ操作の主要経路は確認済みで、リトライや例外の細かな分岐を 100% までは追っていないため
- [`src/features/pdf/invoice-order.server.ts`](../src/features/pdf/invoice-order.server.ts)
  - 通常の請求書生成は確認済みで、例外的な入力・フォールバックの分岐を 100% まで追っていないため
- [`src/features/pdf/pdf-preview-panel.tsx`](../src/features/pdf/pdf-preview-panel.tsx)
  - プレビュー描画の主要経路は確認済みで、UI 補助や読み込み待ちの細かな分岐を 100% までは追っていないため
- [`src/lambda/order-create-handler.ts`](../src/lambda/order-create-handler.ts)
  - 作成 API の正常系・異常系は確認済みで、内部の補助分岐を 100% までは追っていないため
- [`src/lambda/order-get-handler.ts`](../src/lambda/order-get-handler.ts)
  - 取得 API の主要経路は確認済みで、補助的な分岐を 100% までは追っていないため
- [`src/lambda/order-update-delete-handler.ts`](../src/lambda/order-update-delete-handler.ts)
  - 更新・削除 API の主要経路は確認済みで、エラー応答の細かな分岐を 100% までは追っていないため
- [`src/lib/api-client.ts`](../src/lib/api-client.ts)
  - API クライアントの主要利用経路は確認済みで、接続補助の分岐を 100% までは追っていないため

上記は「壊れたら業務影響が大きい分岐」を優先した結果であり、100% 自体を目的にはしていない。

### 11.2 品質基準を支えるテストケース

- `src/features/orders/components/order-form.test.tsx` の表示・送信・異常系ケース
- `src/features/orders/components/order-list.test.tsx` の表示・レイアウト・機能ケース
- `src/features/orders/components/order-detail.test.tsx` の表示・レイアウト・機能ケース
- `src/features/pdf/pdf-preview-panel.test.tsx` の表示・レイアウト・機能ケース
- `src/features/orders/api/order-queries.test.tsx` の fetch / invalidate ケース
- `src/lambda/*.test.ts` の HTTP 契約ケース
- `e2e/*.spec.ts` の正常系・異常系ケース

---

## 12. Phase 6 の完了条件

- テスト種別の役割が分かれている
- 最低限の品質を自動確認できる
- リグレッションを防げる
