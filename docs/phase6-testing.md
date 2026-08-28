# Phase 6 テスト設計

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

## STEP別対応表

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

## STEP46 テスト方針策定

実施内容:
- 何をテストするか決める
- 何をモックするか決める
- 単体 / 結合 / E2E を分ける

確認観点:
- テストの目的がぶれない

完了条件:
- テスト戦略が定義される

### 46.1 前提

- 本システムは注文データを DynamoDB に保存し、PDF やワークフローは AWS サービスを介して動く
- ローカル実行では Next.js、API、Lambda の責務を分けて確認する
- 外部 AWS は原則としてモックし、実際の AWS 連携は少数の手動確認に限定する

### 46.2 テストの対象

- Zod スキーマ
- 金額計算や ID 変換などの純粋関数
- API ルートの入力検証とレスポンス契約
- Lambda ハンドラーの分岐
- React コンポーネントの主要表示分岐
- TanStack Query の取得・更新・再取得
- Service と Repository の接続
- 重要なユーザーフローの E2E

### 46.3 テストしないもの

- AWS コンソールそのものの UI
- PDF のピクセル単位の完全一致
- DynamoDB や S3 の内部実装
- 画面の全枝分かれを無差別に網羅するテスト

### 46.4 モック方針

- AWS SDK は必要な範囲だけモックする
- Repository は Lambda や Service の境界で切る
- API 呼び出しは `fetch` か API クライアント層でモックする
- UI テストはネットワークに依存させない

### 46.5 優先順位

1. 壊れると業務影響が大きい純粋ロジック
2. 注文登録・請求書生成の分岐
3. 画面の主要導線
4. AWS 連携の境界
5. E2E の代表フロー

## STEP47 Vitest導入

実施内容:
- テストランナーを入れる
- 設定ファイルを作る
- 実行コマンドを定義する

確認観点:
- テストが走る

完了条件:
- テスト環境ができる

### 47.1 実装内容

- `vitest` を追加する
- `vitest.config.mts` を追加して `@/` エイリアスと `jsdom` を設定する
- `src/test/setup.ts` で DOM 系の matcher を初期化する
- `test` / `test:watch` / `test:coverage` の npm script を追加する
- smoke test を 1 本置いて実行確認できるようにする

### 47.2 確認方法

1. `npm run test` を実行する
2. Vitest が起動してエラーなく終了することを確認する
3. `npm run test:watch` でウォッチ実行できることを確認する
4. `npm run test:coverage` でカバレッジが出ることを確認する

## STEP48 スキーマ・ユーティリティテスト

実施内容:
- Zod スキーマをテストする
- 金額計算などの純関数をテストする
- 境界値を確認する

確認観点:
- バリデーションが壊れていない

完了条件:
- ロジックの基礎を担保できる

### 48.1 実装内容

- `src/features/orders/schemas/order-schema.test.ts` を追加
- `src/features/orders/utils/order-formatters.test.ts` を追加
- `src/features/pdf/invoice-artifacts.server.test.ts` を追加
- `src/features/pdf/invoice-order.server.test.ts` を追加

### 48.2 確認結果

- Zod の入力検証が通ることを確認した
- 注文種別の表示ラベルと日時/金額フォーマットが期待通りであることを確認した
- 請求書の S3 キー組み立てが固定ルールであることを確認した
- 注文から請求書ドキュメントを組み立てる純関数が期待通りであることを確認した

## STEP49 Reactコンポーネントテスト

実施内容:
- 表示条件を確認する
- フォーム送信を確認する
- エラー表示を確認する
- 画面の主要セクションとレイアウトの崩れやすい部分を確認する

確認観点:
- UI の主要分岐と画面表示が守られる

完了条件:
- 主要コンポーネントを検証できる

### 49.1 実装内容

- [`src/features/orders/components/order-form.test.tsx`](../src/features/orders/components/order-form.test.tsx)
- [`src/features/orders/components/order-list.test.tsx`](../src/features/orders/components/order-list.test.tsx)
- [`src/features/orders/components/order-detail.test.tsx`](../src/features/orders/components/order-detail.test.tsx)
- [`src/features/orders/components/order-status-manager.test.tsx`](../src/features/orders/components/order-status-manager.test.tsx)
- [`src/features/orders/components/order-status-badge.test.tsx`](../src/features/orders/components/order-status-badge.test.tsx)
- [`src/features/pdf/pdf-preview-panel.test.tsx`](../src/features/pdf/pdf-preview-panel.test.tsx)

### 49.2 確認結果

- 注文登録フォームのバリデーション表示と成功表示を確認した
- 注文一覧の検索、絞り込み、空状態、読み込み、削除、見出し表示を確認した
- 注文詳細の主要情報、削除導線、未存在時表示、読み込み時表示を確認した
- ステータス更新パネルの初期状態、更新操作、履歴表示を確認した
- ステータスバッジの表示ラベルとクラスを確認した
- PDF プレビューの注文選択、更新導線、保存導線、iframe の表示構造を確認した
- 画面表示・レイアウトの確認は [`src/features/orders/components/order-form.test.tsx`](../src/features/orders/components/order-form.test.tsx)、[`src/features/orders/components/order-list.test.tsx`](../src/features/orders/components/order-list.test.tsx)、[`src/features/orders/components/order-detail.test.tsx`](../src/features/orders/components/order-detail.test.tsx)、[`src/features/pdf/pdf-preview-panel.test.tsx`](../src/features/pdf/pdf-preview-panel.test.tsx) に分かれている
- 画面表示は見出し・ボタン・空状態・エラー文言を、レイアウト確認は主要セクション配置と PDF プレビュー枠を、機能確認は送信・検索・削除・更新導線をそれぞれ担当させている
- 具体的なケースとしては、注文フォームの主要セクション表示、一覧のテーブル見出し、詳細のカード構成、PDF プレビュー枠の比率、送信成功、検索・削除、詳細遷移、プレビュー更新をそれぞれ個別に検証している

## STEP50 TanStack Queryテスト

実施内容:
- fetch 成功時の動作を確認する
- エラー時の動作を確認する
- キャッシュ更新を確認する

確認観点:
- API 呼び出し後の更新が正しい

完了条件:
- 非同期UIを検証できる

### 50.1 実装内容

- [`src/features/orders/api/order-queries.test.tsx`](../src/features/orders/api/order-queries.test.tsx)

### 50.2 具体的なテストケース

- `fetches orders with normalized filters`
- `surfaces errors when fetching orders fails`
- `fetches a single order detail`
- `fetches the current order status`
- `surfaces errors when fetching order status fails`
- `invalidates cached order queries after creating an order`
- `invalidates cached order queries after updating an order status`
- `removes detail cache and invalidates lists after deleting an order`

## STEP51 Lambda単体テスト

実施内容:
- ハンドラーを単体で検証する
- リクエストイベントをモックする
- レスポンス形式を確認する

確認観点:
- Lambda の契約が崩れていない

完了条件:
- バックエンドの中核をテストできる

### 51.1 実装内容

- [`src/lambda/order-create-handler.test.ts`](../src/lambda/order-create-handler.test.ts)
- [`src/lambda/order-get-handler.test.ts`](../src/lambda/order-get-handler.test.ts)
- [`src/lambda/order-update-delete-handler.test.ts`](../src/lambda/order-update-delete-handler.test.ts)
- [`src/lambda/order-workflow-handler.test.ts`](../src/lambda/order-workflow-handler.test.ts)

### 51.2 具体的なテストケース

- `creates an order and returns a 201 response`
- `rejects invalid order payloads with a 400 response`
- `returns 405 for unsupported methods`
- `returns an order list for collection paths`
- `returns a single order for detail paths`
- `returns 404 when the order does not exist`
- `returns 400 when no order id is available`
- `returns 405 for non-GET methods`
- `updates order status with PATCH`
- `updates the full order payload with PATCH`
- `returns 404 when the target order does not exist`
- `returns 400 for invalid PATCH payloads`
- `deletes an order with DELETE`
- `returns 405 for unsupported methods`
- `throws when required workflow fields are missing`
- `returns a completed prepare step`
- `throws a simulated failure when shouldFail is enabled`
- `keeps prepareCompletedAt on finalize steps`

## STEP52 モック戦略

実施内容:
- 外部APIをどこでモックするか決める
- DynamoDB や AWS SDK をどう扱うか決める
- モックの粒度を統一する

確認観点:
- テストが過剰に壊れない

完了条件:
- モック方針が揃う

### 52.1 基本方針

- モックは「境界」に置く
- 画面テストは API ではなく Query hook をモックする
- Query hook のテストは `fetch` 層や API 関数をモックする
- Lambda 単体テストは Repository や AWS SDK をモックする
- Service テストでは Repository を差し替える
- 純粋関数はモックしない

### 52.2 モック対象の優先順位

1. 外部ネットワーク
2. AWS SDK
3. Repository
4. API クライアント
5. Query hook

### 52.3 レイヤ別ルール

- UI コンポーネントは `useQuery` / `useMutation` をモックする
- TanStack Query テストは API 関数をモックし、`QueryClient` の挙動を確認する
- Lambda 単体テストは `order-service` などの依存をモックする
- `SNSClient` / `S3Client` / EventBridge は AWS SDK のモックで止める
- `DynamoDBClient` は Repository テスト以外では直接使わない

### 52.4 Vitest での実装ルール

- `vi.mock` はトップレベルで宣言する
- モック参照が hoist されるので、必要なものは `vi.hoisted` で初期化する
- 各テスト後は `mockReset` か `clearAllMocks` を行う
- 環境変数は `stubEnv` または `delete process.env...` で明示的に戻す
- テスト対象の実装そのものはモックしない

### 52.5 使い分けの基準

- 失敗原因を素早く特定したいときは、より下位の境界をモックする
- 画面の分岐を見たいときは、API より上位をモックする
- AWS の挙動を確認したいときだけ、限定的に SDK のモックを外す
- 実装の都合でモックが複雑化する場合は、依存の責務分離を先に見直す

### 52.6 このプロジェクトでの標準パターン

- `src/features/orders/components/*.test.tsx` は query hook をモックする
- `src/features/orders/api/order-queries.test.tsx` は API 関数をモックする
- `src/lambda/*.test.ts` は service / repository / AWS SDK をモックする
- `src/features/pdf/*.test.ts` は S3 保存や署名付き URL を境界で止める
- `src/lib/*.test.ts` は `fetch` を直接モックする

### 52.7 実装を支える代表ファイル

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

### 52.8 代表ケース

- `renders the main form sections and actions`
- `renders the main list sections and table headers`
- `renders the main detail sections and cards`
- `renders the preview frame with the expected layout structure`
- `fetches orders with normalized filters`
- `creates an order and returns a 201 response`
- `returns an order list for collection paths`
- `updates order status with PATCH`
- `creates and retrieves an order through the repository`
- `loads orders and keeps the preview actions in sync with the selected order`

## STEP53 統合テスト

実施内容:
- API と Repository をつなげて確認する
- 実装境界のテストを書く

確認観点:
- 実際の流れが壊れない

完了条件:
- 複数層の接続を確認できる

### 53.1 実装内容

- [`src/features/orders/services/order-service.integration.test.ts`](../src/features/orders/services/order-service.integration.test.ts)

### 53.2 確認結果

- Service から Repository を通して注文を作成・取得できることを確認した
- 検索条件が Repository 側で正しく反映されることを確認した
- ステータス更新後に他の属性が壊れないことを確認した
- フル更新後に合計金額が再計算されることを確認した
- 削除後に再取得できなくなることを確認した

### 53.3 具体的なテストケース

- `creates and retrieves an order through the repository`
- `filters orders through searchOrders`
- `updates order status and keeps other fields intact`
- `updates the full order payload and recalculates totals`
- `deletes an order and makes it unavailable`

## STEP54 E2Eテスト

実施内容:
- 画面から注文登録まで通す
- 画面から一覧・詳細を確認する
- 画面全体の表示崩れや主要レイアウトを確認する

確認観点:
- ユーザー操作と画面表示が通る

完了条件:
- 実運用に近い流れを確認できる

### 54.1 実装内容

- [`playwright.config.ts`](../playwright.config.ts)
- [`e2e/order-registration.spec.ts`](../e2e/order-registration.spec.ts)
- [`e2e/pdf-preview.spec.ts`](../e2e/pdf-preview.spec.ts)
- [`scripts/run-e2e-coverage.mjs`](../scripts/run-e2e-coverage.mjs)
- [`scripts/collect-e2e-coverage.mjs`](../scripts/collect-e2e-coverage.mjs)

### 54.2 確認結果

- 注文登録フォームから注文を作成できることを確認した
- PDF プレビューで注文を切り替えられることを確認した
- PDF 生成 URL、S3 保存 URL、署名付き URL が注文 ID に応じて変わることを確認した
- 画面遷移時に主要な表示崩れがないことを確認する設計にしている
- E2E coverage は `npm run test:e2e:coverage` で出力し、`.playwright-coverage/report` に集約する
- 参照対象は `coverage-summary.json` と `case-summary.md` を基本とし、`index.html` は生成しない
- raw の JSON は通常は残さず、必要な場合だけ `PLAYWRIGHT_E2E_COVERAGE_KEEP_RAW=1` で保持する
- `case-summary.md` は相対パスの Test File、Test Case、Result、Error を並べた一覧として読む

### 54.3 具体的なテストケース

- `注文登録フォームから注文を作成できる`
- `注文登録フォームは空送信時に入力エラーを表示する`
- `注文登録フォームはサーバー失敗時に一般エラーを表示する`
- `PDF プレビューで注文を切り替え、生成 URL を確認できる`
- `PDF プレビューは注文一覧の取得失敗を表示する`

## STEP55 カバレッジ・品質基準

実施内容:
- 必要なカバレッジ基準を決める
- fail 条件を決める
- レポートの見方を定める

確認観点:
- 品質を数値で追える

完了条件:
- テスト運用の基準ができる

### 55.1 実装内容

- [`vitest.config.mts`](../vitest.config.mts)

### 55.2 品質基準

- Statements: 80% 以上
- Lines: 80% 以上
- Functions: 80% 以上
- Branches: 70% 以上
- E2E は別枠で `playwright test` を通す
- `src/` 配下の Vitest 対象に対して基準を適用する

### 55.3 確認結果

- `npm run test:coverage` で現在の実装が基準を満たすことを確認した
- `npm run test` と `npm run lint` と `npx tsc --noEmit` が通ることを確認した
- `PLAYWRIGHT_WEB_SERVER=0 npm run test:e2e` で E2E の正常系と異常系が通ることを確認した

### 55.4 品質を支えるテストケース

- 画面表示
  - `renders the main form sections and actions`
  - `renders the main list sections and table headers`
  - `renders the main detail sections and cards`
  - `renders the preview frame with the expected layout structure`
- レイアウト
  - `renders the main form sections and actions`
  - `renders the main list sections and table headers`
  - `renders the main detail sections and cards`
  - `renders the preview frame with the expected layout structure`
- 機能
  - `submits a valid order and shows success feedback`
  - `renders orders and updates filters before deleting an order`
  - `renders an order detail and navigates back after deleting`
  - `loads orders and keeps the preview actions in sync with the selected order`

### 55.5 100% に届いていない理由

`test:coverage` は基準を満たしているが、以下のファイルは 100% まで追っていない。

- [`src/features/orders/api/order-queries.ts`](../src/features/orders/api/order-queries.ts)
  - `all` や空文字の正規化など、枝分かれはあるが重要度の低い組み合わせが残っているため
- [`src/features/orders/components/order-detail.tsx`](../src/features/orders/components/order-detail.tsx)
  - 未取得時、再取得失敗、削除確認などの補助分岐が残っているため
- [`src/features/orders/components/order-form.tsx`](../src/features/orders/components/order-form.tsx)
  - 主要導線は確認済みで、入力補助や表示補助の細かな分岐を 100% までは追っていないため
- [`src/features/orders/components/order-list.tsx`](../src/features/orders/components/order-list.tsx)
  - 表示崩れを防ぐ主要ケースは確認済みで、残りは表示補助の枝分かれが中心のため
- [`src/features/orders/components/order-status-manager.tsx`](../src/features/orders/components/order-status-manager.tsx)
  - 更新成功・失敗・戻す操作は確認済みで、残りは履歴表示などの補助分岐が中心のため
- [`src/features/orders/repositories/dynamo-db-order-repository.ts`](../src/features/orders/repositories/dynamo-db-order-repository.ts)
  - `ConditionalCheckFailedException` や壊れた item の正規化など、防御的分岐が残るため
- [`src/features/pdf/invoice-order.server.ts`](../src/features/pdf/invoice-order.server.ts)
  - 通常の請求書生成は確認済みで、例外的な入力・フォールバックの分岐を 100% まで追っていないため
- [`src/features/pdf/pdf-preview-panel.tsx`](../src/features/pdf/pdf-preview-panel.tsx)
  - 注文取得失敗、再生成、外部導線は確認済みで、iframe 周辺の細かな分岐は主要確認対象に含めていないため
- [`src/lambda/order-create-handler.ts`](../src/lambda/order-create-handler.ts)
  - 正常系、入力不備、既定メソッドは確認済みで、残りは契約補助の分岐が中心のため
- [`src/lambda/order-get-handler.ts`](../src/lambda/order-get-handler.ts)
  - 一覧・詳細・404・pathParameters 優先は確認済みで、残りは補助的な分岐が中心のため
- [`src/lambda/order-update-delete-handler.ts`](../src/lambda/order-update-delete-handler.ts)
  - PATCH / DELETE の主要経路は確認済みで、エラー応答の細部や補助分岐が残るため
- [`src/lib/api-client.ts`](../src/lib/api-client.ts)
  - URL 正規化とエラー変換は確認済みで、JSON 失敗や空 query の補助分岐のみが残っているため

上記は「壊れたら業務影響が大きい分岐」を優先した結果であり、100% 自体を目的にはしていない。
