# Phase 8 認証・セキュリティ・運用

対象STEP:
- STEP66 Cognito認証
- STEP67 認可
- STEP68 IAM最小権限
- STEP69 機密情報管理
- STEP70 APIセキュリティ
- STEP71 ログ設計
- STEP72 監視
- STEP73 障害対応

## STEP66 Cognito認証

実施内容:
- ユーザープールを作る
- サインイン方法を決める
- フロントエンドと接続する

実施結果:
- [infra/lib/order-api-stack.js](/home/kurosaki/order-management-system/infra/lib/order-api-stack.js) に Cognito User Pool / App Client / Hosted UI domain を追加し、`dev` は `http://localhost:3000/api/auth/callback`、`prod` は `https://app.example.com/api/auth/callback` を callback URL として持たせた
- [`src/features/auth/cognito-auth.server.ts`](/home/kurosaki/order-management-system/src/features/auth/cognito-auth.server.ts) を追加し、Cognito の authorize / token / logout URL 生成、PKCE、JWT payload の読み取りを共通化した
- [`src/app/api/auth/login/route.ts`](/home/kurosaki/order-management-system/src/app/api/auth/login/route.ts) で Cognito Hosted UI へ遷移し、[`src/app/api/auth/callback/route.ts`](/home/kurosaki/order-management-system/src/app/api/auth/callback/route.ts) で code を token に交換して cookie に保存するようにした
- [`src/app/login/page.tsx`](/home/kurosaki/order-management-system/src/app/login/page.tsx) を追加し、未ログイン時の入口を用意した
- [`src/proxy.ts`](/home/kurosaki/order-management-system/src/proxy.ts) で未ログインの画面アクセスを `/login` にリダイレクトするようにした
- [`src/components/layouts/app-shell.tsx`](/home/kurosaki/order-management-system/src/components/layouts/app-shell.tsx) と [`src/components/layouts/app-header.tsx`](/home/kurosaki/order-management-system/src/components/layouts/app-header.tsx) を更新し、セッション表示とログイン/ログアウト導線を追加した
- 実行時に必要な環境変数は `COGNITO_USER_POOL_CLIENT_ID`、`COGNITO_DOMAIN_BASE_URL`、`COGNITO_REDIRECT_URI`、`COGNITO_LOGOUT_URI` の4つに整理した

確認観点:
- ログイン導線がある
- セッション cookie が作られる
- 未ログイン時に保護画面へ入れない

確認結果:
- `npm run test` で既存テストを含め 26 ファイル / 144 テストが成功した
- Cognito ヘルパーの単体テストで authorize URL、logout URL、PKCE、JWT セッション読み取りを確認した

確認観点:
- ユーザー認証ができる

完了条件:
- ログイン基盤ができる

## STEP67 認可

実施内容:
- 権限グループを定義する
- 画面表示とAPIアクセスを制御する

実施結果:
- [`infra/lib/order-api-stack.js`](/home/kurosaki/order-management-system/infra/lib/order-api-stack.js) で Cognito User Pool に `admin` / `operator` / `viewer` の 3 グループを追加し、操作権限の土台を作った
- [`src/features/auth/authorization.server.ts`](/home/kurosaki/order-management-system/src/features/auth/authorization.server.ts) を追加し、`admin` は削除まで、`operator` は登録と更新まで、`viewer` は閲覧のみ、という判定を共通化した
- [`src/app/api/orders/route.ts`](/home/kurosaki/order-management-system/src/app/api/orders/route.ts) と [`src/app/api/orders/[id]/route.ts`](/home/kurosaki/order-management-system/src/app/api/orders/[id]/route.ts) と [`src/app/api/orders/[id]/status/route.ts`](/home/kurosaki/order-management-system/src/app/api/orders/[id]/status/route.ts) に認可チェックを入れ、未認証は 401、権限不足は 403 を返すようにした
- [`src/app/orders/new/page.tsx`](/home/kurosaki/order-management-system/src/app/orders/new/page.tsx) で登録画面を `operator` / `admin` のみに制限し、[`src/app/orders/[id]/page.tsx`](/home/kurosaki/order-management-system/src/app/orders/[id]/page.tsx) と各注文コンポーネントで削除・ステータス更新の表示を出し分けた
- [`src/app/forbidden/page.tsx`](/home/kurosaki/order-management-system/src/app/forbidden/page.tsx) を追加し、権限不足時の行き先を明示した
- [`src/features/auth/authorization.server.test.ts`](/home/kurosaki/order-management-system/src/features/auth/authorization.server.test.ts) を追加し、各ロールの許可範囲を単体で確認した

確認観点:
- 役割ごとにできる操作が分かれる
- UI から不要な操作が見えない
- API でも権限不足が止まる

確認結果:
- `npm run test` で 26 ファイル / 144 テストが成功した
- `npm run build` でも認証・認可を含めて production build が成功した

確認観点:
- 権限のない操作ができない

完了条件:
- 権限分離ができる

## STEP68 IAM最小権限

実施内容:
- Lambda / CI / 運用ロールの権限を絞る
- いらない権限を削る

実施結果:
- [`infra/lib/github-oidc-stack.js`](/home/kurosaki/order-management-system/infra/lib/github-oidc-stack.js) で GitHub Actions の OIDC role から `cdk-hnb659fds-lookup-role` への `sts:AssumeRole` 権限を外し、CDK deploy に必要な `file-publishing-role` と `deploy-role` だけを許可する形に整理した
- `OmsGithubOidcStack` を `AWS_PROFILE=oms-dev AWS_SDK_LOAD_CONFIG=1 npx cdk deploy OmsGithubOidcStack --require-approval never` で再デプロイし、`no changes` で通ることを確認した
- 既存の Orders / PDF / Auth 周辺の権限は、CDK の `grant*` を使った resource-scoped な設定になっていることを再確認した
- この時点でアプリの実行に不要な CI 側の引き受け権限を一段減らせた

確認観点:
- 必要最小限で動く

確認結果:
- GitHub Actions の OIDC role が bootstrap の lookup role まで引き受ける必要がなくなった
- CDK deploy の動作は維持したまま、引き受け対象を最小限に絞れた

完了条件:
- IAM の過剰権限を減らせる

## STEP69 機密情報管理

実施内容:
- 環境変数と秘密情報を分ける
- SSM / Secrets Manager の使い分けを決める

実施結果:
- [`src/lib/runtime-config.server.ts`](/home/kurosaki/order-management-system/src/lib/runtime-config.server.ts) を追加し、サーバー側で使う設定値の取得口を 1 か所に集約した
- [`src/features/orders/repositories/dynamo-db-order-repository.ts`](/home/kurosaki/order-management-system/src/features/orders/repositories/dynamo-db-order-repository.ts)、[`src/features/orders/events/order-event-publisher.ts`](/home/kurosaki/order-management-system/src/features/orders/events/order-event-publisher.ts)、[`src/lambda/order-notification-handler.ts`](/home/kurosaki/order-management-system/src/lambda/order-notification-handler.ts)、[`src/features/pdf/invoice-artifacts.server.ts`](/home/kurosaki/order-management-system/src/features/pdf/invoice-artifacts.server.ts) から、設定値取得の重複を減らして役割を揃えた
- [`.env.example`](/home/kurosaki/order-management-system/.env.example) に公開設定、非機密の実行設定、秘密情報の置き場所を追記し、混在しないようにした
- [`src/lib/runtime-config.server.test.ts`](/home/kurosaki/order-management-system/src/lib/runtime-config.server.test.ts) を追加し、設定取得と必須値のエラーが意図どおりに動くことを確認した

確認観点:
- 秘密情報がコードに入らない

確認結果:
- 秘密そのものはコードに持たず、必要な実行設定のみを共通ヘルパーから読む構成に寄せた
- 実際に秘匿すべき値は `.env.example` ではなく Secrets Manager / GitHub Secrets に置く前提を明文化した
- `npm run test` で 27 ファイル / 147 テストが成功した
- `npm run build` で production build が成功した

完了条件:
- 安全な設定管理ができる

## STEP70 APIセキュリティ

実施内容:
- 認証必須のAPIを決める
- CORS と入力検証を見直す

実施結果:
- [`src/lib/api-security.server.ts`](/home/kurosaki/order-management-system/src/lib/api-security.server.ts) を追加し、変更系 API の同一オリジン確認と JSON 受付条件を共通化した
- [`src/app/api/orders/route.ts`](/home/kurosaki/order-management-system/src/app/api/orders/route.ts) で注文作成時に同一オリジンかつ `application/json` のみ受け付けるようにした
- [`src/app/api/orders/[id]/route.ts`](/home/kurosaki/order-management-system/src/app/api/orders/[id]/route.ts) と [`src/app/api/orders/[id]/status/route.ts`](/home/kurosaki/order-management-system/src/app/api/orders/[id]/status/route.ts) で削除とステータス更新の同一オリジン確認を入れた
- [`src/app/api/pdf/invoice/store/route.ts`](/home/kurosaki/order-management-system/src/app/api/pdf/invoice/store/route.ts) と [`src/app/api/pdf/invoice/signed-url/route.ts`](/home/kurosaki/order-management-system/src/app/api/pdf/invoice/signed-url/route.ts) でも同一オリジン確認を入れ、S3 への保存系 API をブラウザ外から雑に叩けないようにした
- [`src/app/api/orders/route.test.ts`](/home/kurosaki/order-management-system/src/app/api/orders/route.test.ts) と [`src/lib/api-security.server.test.ts`](/home/kurosaki/order-management-system/src/lib/api-security.server.test.ts) を追加し、403 / 415 の境界を確認した

確認観点:
- 不正呼び出しを抑えられる

確認結果:
- cross-site のリクエストは 403 で止まる
- JSON を要求する API は `Content-Type` が不足すると 415 で止まる
- `npm run test` で 28 ファイル / 152 テストが成功した
- `npm run build` で production build が成功した

完了条件:
- API の防御線が整う

## STEP71 ログ設計

実施内容:
- ログ形式を決める
- 追跡ID を入れる
- 調査しやすい情報を残す

実施結果:
- [`src/lib/logging.server.ts`](/home/kurosaki/order-management-system/src/lib/logging.server.ts) を追加し、CloudWatch Logs で追いやすい 1 行 JSON の構造化ログを共通化した
- [`src/lambda/order-api-gateway-handler.ts`](/home/kurosaki/order-management-system/src/lambda/order-api-gateway-handler.ts) で `requestId` と `orderId` を残し、イベント配信失敗時も追跡できるようにした
- [`src/lambda/order-create-handler.ts`](/home/kurosaki/order-management-system/src/lambda/order-create-handler.ts)、[`src/lambda/order-workflow-handler.ts`](/home/kurosaki/order-management-system/src/lambda/order-workflow-handler.ts)、[`src/lambda/order-invoice-generation-handler.ts`](/home/kurosaki/order-management-system/src/lambda/order-invoice-generation-handler.ts)、[`src/lambda/order-queue-consumer.ts`](/home/kurosaki/order-management-system/src/lambda/order-queue-consumer.ts)、[`src/lambda/order-notification-handler.ts`](/home/kurosaki/order-management-system/src/lambda/order-notification-handler.ts) で、`requestId` / `eventId` / `orderId` / `workflow` を揃えた
- [`src/lib/logging.server.test.ts`](/home/kurosaki/order-management-system/src/lib/logging.server.test.ts) を追加し、info / warn / error の JSON ログが期待どおり出ることを確認した

確認手順:
1. ローカル確認
   - `npm run test -- src/lib/logging.server.test.ts` で JSON ログの形を確認する
   - `npm run test` で主要ハンドラの回帰をまとめて確認する
2. AWS での追跡
   - `aws logs tail /aws/lambda/oms-dev-order-api --follow --since 1h --profile oms-dev --region ap-northeast-1`
   - `aws logs tail /aws/lambda/oms-dev-order-workflow-task --follow --since 1h --profile oms-dev --region ap-northeast-1`
   - `requestId`、`eventId`、`orderId` を含む行を見て、1 件の注文の流れを追う
3. CloudWatch Logs Insights
   - まずロググループを 1 つ選ぶ
   - まず全体を見る
     ```sql
     fields @timestamp, level, message, requestId, eventId, orderId, workflow
     | sort @timestamp desc
     | limit 50
     ```
   - 1 件のリクエストを追う
     ```sql
     fields @timestamp, level, message, requestId, eventId, orderId, workflow
     | filter requestId = "req-001"
     | sort @timestamp asc
     ```
   - 1 件の注文を追う
     ```sql
     fields @timestamp, level, message, requestId, eventId, orderId, workflow
     | filter orderId = "ORD-TEST-001"
     | sort @timestamp asc
     ```
   - エラーだけを見る
     ```sql
     fields @timestamp, level, message, requestId, eventId, orderId, workflow, error.message
     | filter level = "error"
     | sort @timestamp desc
     | limit 50
     ```
   - ワークフローだけを見る
     ```sql
     fields @timestamp, level, message, requestId, eventId, orderId, workflow, step
     | filter workflow = "order-processing"
     | sort @timestamp asc
     ```
4. すぐ使える tail コマンド
   - `aws logs tail /aws/lambda/oms-dev-order-api --profile oms-dev --region ap-northeast-1 --since 1h --follow`
   - `aws logs tail /aws/lambda/oms-dev-order-workflow-task --profile oms-dev --region ap-northeast-1 --since 1h --follow`
   - `aws logs tail /aws/lambda/oms-dev-order-invoice-generation --profile oms-dev --region ap-northeast-1 --since 1h --follow`
   - `aws logs tail /aws/lambda/oms-dev-order-queue-consumer --profile oms-dev --region ap-northeast-1 --since 1h --follow`
   - `aws logs tail /aws/lambda/oms-dev-order-notification --profile oms-dev --region ap-northeast-1 --since 1h --follow`
   - prod を見る場合は `oms-dev` を `oms-prod` に置き換える
   - `--filter-pattern '"orderId"'` を足すと、注文追跡向けの行だけに寄せやすい
   - `--filter-pattern '"level":"error"'` を足すと、失敗ログだけ追いやすい

確認観点:
- 障害時に追える

確認結果:
- ログに `requestId` / `eventId` / `orderId` / `userId` を載せる土台を作れた
- 業務イベントの成功・失敗を構造化ログで追えるようになった
- `npm run test` で 29 ファイル / 155 テストが成功した
- `npm run build` で production build が成功した

完了条件:
- ログの基盤が整う

## STEP72 監視

実施内容:
- CloudWatch アラームを作る
- メトリクスを確認する
- 失敗検知を入れる

実施結果:
- [`infra/lib/order-api-stack.js`](/home/kurosaki/order-management-system/infra/lib/order-api-stack.js) に CloudWatch アラームを追加し、API と Lambda の失敗をまとめて監視できるようにした
- 監視対象は DLQ、SQS backlog、Step Functions 失敗、API 5xx、各 Lambda エラーの 9 つに整理した
- 各アラームは 5 分粒度・1 回の失敗で検知し、`treatMissingData` は `NOT_BREACHING` にした
- [`infra/lib/order-api-stack.test.js`](/home/kurosaki/order-management-system/infra/lib/order-api-stack.test.js) で alarmName と定義数を確認した
- `AWS_PROFILE=oms-dev AWS_SDK_LOAD_CONFIG=1 npx cdk deploy OmsdevOrderApiStack -c stage=dev --require-approval never` で `no changes` を確認した

確認観点:
- 異常を早く察知できる
- どの異常がどのアラームに対応するか分かる
- コンソールで監視対象をすぐ確認できる

確認結果:
- CloudWatch のアラーム一覧で、9 つの監視対象を個別に確認できる
- `oms-dev-order-invoice-generation-error-alarm` は `shouldFailInvoice: true` で発火することを確認した

確認手順:
1. CloudWatch コンソールを開く
2. 左メニューの `Alarms` を選ぶ
3. `All alarms` で `oms-dev-` から始まるアラームを確認する
4. それぞれのアラームで、対象サービスと alarmName が一致しているかを見る
5. 必要なら `CloudWatch > Metrics` で `AWS/ApiGateway` の `5XXError`、`AWS/Lambda` の `Errors`、`AWS/SQS` の `ApproximateNumberOfMessagesVisible`、`AWS/States` の失敗系メトリクスを確認する
6. `oms-dev-order-invoice-generation-error-alarm` を試すときは、Step Functions の `Start execution` に以下を入れる
   ```json
   {
     "workflow": "order-processing",
     "detailType": "OrderCreated",
     "orderId": "ORD-TEST-001",
     "eventId": "evt-test-001",
     "shouldFailInvoice": true
   }
   ```
   `shouldFail` ではなく `shouldFailInvoice` を使うと、prepare ではなく invoice ステップだけを失敗させられる
7. 失敗実行後にアラームが `ALARM` へ変化し、Lambda ログに `Simulated invoice generation failure for order ORD-TEST-001` が残ることを確認する

完了条件:
- 監視が動く

補足:
- 発火しなかった原因は、失敗確認用 JSON が invoice 生成前の `PrepareOrderWorkflowTask` で止まっていたため
- 修正として、invoice 生成だけを落とす `shouldFailInvoice` を追加し、workflow と Lambda の両方でそのフラグを扱うようにした
- これで invoice 生成 Lambda だけを狙って失敗させ、`oms-dev-order-invoice-generation-error-alarm` を再現できるようになった

## STEP73 障害対応

実施内容:
- 障害手順をまとめる
- 切り分け方法を定義する
- 復旧後の確認を決める

確認観点:
- 何を見ればよいか明確

完了条件:
- 運用対応ができる
