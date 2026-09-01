# STEP74 全機能統合

この手順書は、Phase 9 の最初の作業として、注文管理システムの主要機能がひとつの業務フローとしてつながっているかを確認するための記録である。

このSTEPでは、画面、API、DynamoDB、EventBridge、SQS / DLQ、Step Functions、Cognito、CloudWatch、PDF 帳票をまとめて確認する。

## 目的

- フロント、API、AWS を一連の業務システムとして確認する
- ログイン後に注文登録から帳票確認までを通して操作できるようにする
- dev / prod の切り替えが壊れていないことを確認する
- 障害時にどこを見るかを業務フローごとに把握する

## 前提

- STEP66 で Cognito ログインができる
- STEP67 で `admin` / `operator` / `viewer` の認可が入っている
- STEP68 で IAM 最小権限が整理されている
- STEP69 で設定値の取得口が整理されている
- STEP70 で API セキュリティが入っている
- STEP71 で構造化ログが出る
- STEP72 で CloudWatch アラームが作成されている
- STEP73 で障害対応の切り分け方を整理している
- ローカル起動または dev 環境でアプリを確認できる

## このSTEPで扱う範囲

このSTEPでは、次の流れをまとめて確認する。

- Cognito ログイン
- 注文一覧、詳細、新規登録、更新、削除
- EventBridge に送られる注文イベント
- Step Functions に流れる後続処理
- PDF プレビュー、PDF 保存、署名付き URL
- CloudWatch Logs と CloudWatch Alarms

## 1. 画面起点で全体を開く

まずログインして、注文画面に入る。

### 確認手順

1. `http://localhost:3000/login` を開く
2. Cognito でログインする
3. `注文一覧` を開く
4. `新規注文`、`詳細`、`帳票プレビュー` に遷移できることを確認する

### 確認ポイント

- 未ログイン時は保護画面に入れない
- ログイン後に注文画面へ進める
- ヘッダーにログイン状態が表示される
- サイドバーから各機能へ移動できる

## 2. 注文登録から保存までを通す

注文登録 API と DynamoDB の流れを確認する。

### 確認手順

1. `注文登録` 画面を開く
2. 必要項目を入力して注文を登録する
3. 注文一覧に反映されることを確認する
4. 注文詳細を開き、内容が一致していることを確認する
5. 更新と削除の操作が権限に応じて表示されることを確認する

### 確認ポイント

- 注文が DynamoDB に保存される
- 一覧、詳細、編集の表示が一致する
- 401 / 403 / 400 の出し分けが崩れていない

## 3. EventBridge と Step Functions を通す

注文作成後の非同期処理が起動することを確認する。

### 確認手順

1. 注文を 1 件登録する
2. EventBridge へ `OrderCreated` が送られることを確認する
3. `oms-dev-order-processing-workflow` が開始されることを確認する
4. Step Functions の実行入力に注文情報が残ることを確認する
5. `prepare` / `finalize` が順に進むことを確認する

### 確認ポイント

- 注文イベントがワークフローに流れている
- 通常の `OrderCreated` 経路では `shouldFailInvoice: false` が補われている
- 実行履歴に注文 ID と event ID が残る
- ログで 1 件の注文の流れを追える

## 4. 帳票出力を通す

請求書プレビュー、PDF 生成、S3 保存、署名付き URL を確認する。

### 確認手順

1. `帳票プレビュー` を開く
2. 注文を選択して `プレビューを更新` を押す
3. 請求書プレビューが表示されることを確認する
4. `PDF を開く` で別タブ表示できることを確認する
5. `S3 に保存` を押して保存できることを確認する
6. `署名付き URL` で一時的に参照できることを確認する

### 確認ポイント

- 帳票が注文データに連動している
- 日本語が崩れていない
- プレビュー、保存、参照の導線が分かれている
- S3 に保存した PDF を後から取り出せる

## 5. 監視とログを確認する

CloudWatch の観点で、失敗と復旧が追えることを確認する。

### 確認手順

1. CloudWatch の `Alarms` を開く
2. `oms-dev-` から始まるアラームが見えることを確認する
3. CloudWatch Logs で `requestId` / `eventId` / `orderId` を追う
4. Step Functions の `Executions` で実行履歴を確認する
5. SQS / DLQ の件数を確認する

### 確認ポイント

- どのアラームがどの障害に対応するか分かる
- ログから 1 件の注文の流れを追える
- DLQ や Step Functions 失敗を見れば、どこで止まったか分かる

## 6. dev / prod の切り替えを確認する

環境差分が正しく効いていることを確認する。

### 確認手順

1. dev 環境でログインと注文操作を確認する
2. prod の URL や環境変数が dev と別であることを確認する
3. GitHub Actions の deploy 設定が dev / prod で分かれていることを確認する
4. 必要に応じて `workflow_dispatch` で prod 側の流れを確認する

### 確認ポイント

- dev と prod の URL が混ざっていない
- 誤って本番へ流す導線がない
- デプロイ先と認証が一致している

## 7. よくある失敗

### ログインできない

確認すること:

- Cognito の callback URL が一致しているか
- `COGNITO_USER_POOL_ID`、`COGNITO_USER_POOL_CLIENT_ID` などの設定値が入っているか
- `proxy.ts` の未ログインリダイレクトが正しいか

### 注文登録後に一覧へ戻らない

確認すること:

- API が 201 を返しているか
- React Query の invalidate が走っているか
- `orderId` が正しく生成されているか

### ワークフローが起動しない

確認すること:

- EventBridge rule が `OrderCreated` を拾っているか
- `source` が `oms.orders` か
- Step Functions の ARN が正しいか
- `shouldFailInvoice` が通常経路で `false` に補われているか

### 帳票が表示されない

確認すること:

- `/api/pdf/invoice` が 200 で返るか
- `PDF_INVOICE_BUCKET_NAME` が設定されているか
- 日本語フォントの読み込みに失敗していないか

### アラームが上がらない

確認すること:

- `stage=dev` のスタックが最新か
- 対象アラーム名が一致しているか
- 監視対象のメトリクスが更新されているか

## 8. 完了条件を満たすための確認手順

このSTEPの完了条件は、次の 5 つを順番に満たせばクリアできる。

### 8.1 認証と画面遷移を確認する

1. `/login` にアクセスする
2. Cognito でログインする
3. `注文一覧` に入る
4. `新規注文`、`詳細`、`帳票プレビュー` に遷移できることを確認する
5. 未ログイン時は `/login` に戻ることを確認する

判定:

- ログイン後に画面遷移できる
- 権限のない画面へは入れない

### 8.2 注文データの流れを確認する

1. 注文を 1 件登録する
2. 一覧に追加されることを確認する
3. 詳細画面で登録内容が一致することを確認する
4. 更新後に一覧と詳細へ反映されることを確認する
5. 削除後に一覧から消えることを確認する

判定:

- DynamoDB への保存と UI 表示が一致する
- API の 201 / 200 / 404 / 403 の出し分けが崩れていない

### 8.3 非同期フローを確認する

1. 注文登録後に EventBridge へ `OrderCreated` が送られることを確認する
2. `oms-dev-order-processing-workflow` が開始されることを確認する
3. `prepare` / `finalize` が順に進むことを確認する
4. Step Functions の実行入力に注文 ID と event ID が残ることを確認する

判定:

- 注文イベントがワークフローへつながる
- 通常経路では `shouldFailInvoice: false` が入っている
- 実行履歴とログで流れを追える

### 8.4 帳票フローを確認する

1. `帳票プレビュー` を開く
2. 注文を選択してプレビュー更新を行う
3. `/api/pdf/invoice` が 200 で返ることを確認する
4. `PDF を開く` で別タブ表示できることを確認する
5. `S3 に保存` で PDF が保存されることを確認する
6. `署名付き URL` で一時参照できることを確認する

判定:

- 請求書が注文データに連動する
- S3 保存と一時参照が使える

### 8.5 監視と切り分けを確認する

1. CloudWatch の `Alarms` を開く
2. `oms-dev-` から始まるアラームが見えることを確認する
3. CloudWatch Logs で `requestId` / `eventId` / `orderId` を追う
4. SQS / DLQ の件数と Step Functions の `Executions` を確認する
5. `shouldFailInvoice` を使って invoice 生成失敗を再現する
6. `oms-dev-order-invoice-generation-error-alarm` が `ALARM` になることを確認する

判定:

- どの障害がどの観測点に出るか分かる
- 復旧の手順を再現できる

### 8.6 dev / prod の切り替えを確認する

1. dev でログインと注文操作を確認する
2. prod の URL と環境変数が dev と別であることを確認する
3. GitHub Actions で dev / prod の deploy 定義が分かれていることを確認する

判定:

- 環境差分が混ざっていない
- 誤デプロイの導線がない

## 9. 完了条件

次を満たせば STEP74 は完了である。

- ログイン後に注文登録から帳票確認まで通る
- EventBridge と Step Functions がつながっている
- 通常の `OrderCreated` 実行で `shouldFailInvoice` 不足による失敗が起きない
- S3 保存と署名付き URL が使える
- CloudWatch Logs と Alarms で追跡できる
- dev / prod の切り替えが壊れていない

## 10. 次のSTEP

STEP74 が完了したら、STEP75 で注文管理業務フロー全体を通して整理する。
