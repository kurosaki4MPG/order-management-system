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

確認観点:
- 必要最小限で動く

完了条件:
- IAM の過剰権限を減らせる

## STEP69 機密情報管理

実施内容:
- 環境変数と秘密情報を分ける
- SSM / Secrets Manager の使い分けを決める

確認観点:
- 秘密情報がコードに入らない

完了条件:
- 安全な設定管理ができる

## STEP70 APIセキュリティ

実施内容:
- 認証必須のAPIを決める
- CORS と入力検証を見直す

確認観点:
- 不正呼び出しを抑えられる

完了条件:
- API の防御線が整う

## STEP71 ログ設計

実施内容:
- ログ形式を決める
- 追跡ID を入れる
- 調査しやすい情報を残す

確認観点:
- 障害時に追える

完了条件:
- ログの基盤が整う

## STEP72 監視

実施内容:
- CloudWatch アラームを作る
- メトリクスを確認する
- 失敗検知を入れる

確認観点:
- 異常を早く察知できる

完了条件:
- 監視が動く

## STEP73 障害対応

実施内容:
- 障害手順をまとめる
- 切り分け方法を定義する
- 復旧後の確認を決める

確認観点:
- 何を見ればよいか明確

完了条件:
- 運用対応ができる
