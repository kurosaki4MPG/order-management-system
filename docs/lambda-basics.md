# STEP17 Lambda基礎

このステップでは、AWS Lambda の最小構成を理解する。

## 目的

- Lambda が何を担当するかを整理する
- API Gateway から渡されるイベントの形を把握する
- レスポンスの作り方を理解する
- Next.js の画面層とバックエンド処理の責務を分ける

## Lambda の役割

Lambda は「HTTP リクエストを受けて処理し、JSON を返す」だけの関数ではない。
実際には、API Gateway、S3、DynamoDB、EventBridge、SQS など、さまざまなイベントソースから呼ばれる実行単位になる。

このプロジェクトでは、まず API Gateway から呼ばれる Lambda を基準に学ぶ。

## まず押さえる概念

- Handler: Lambda の入口関数
- Event: 呼び出し元から渡される入力
- Context: 実行環境やリクエスト情報
- Response: 呼び出し元へ返す値
- Timeout: Lambda の実行上限
- Memory: 実行時に使えるメモリ量

## 最小のハンドラー

サンプルとして `src/lambda/order-handler.ts` を追加した。

このサンプルは次の流れを持つ。

- `GET` では `Lambda is ready.` を返す
- `POST` では JSON ボディを読み取り、簡単な入力検証を行う
- それ以外は `405 Method Not Allowed` を返す

実務ではここに以下を追加する。

- Zod による入力検証
- 認証・認可
- DynamoDB への保存
- ログ出力
- エラーハンドリング

## API Gateway との責務分離

### API Gateway

- HTTP の入り口
- ルーティング
- CORS
- 認証連携
- レート制御

### Lambda

- ビジネスロジック
- 入力検証
- 永続化処理
- 外部サービス連携

### Next.js

- UI
- 画面操作
- フォーム入力
- API 呼び出し

この分離を保つと、後続の STEP18 以降で実装が崩れにくい。

## ローカルでの確認方法

この段階では AWS へデプロイしなくても、次の観点を確認できる。

- Handler が `GET` と `POST` を分けているか
- JSON を文字列化して返しているか
- 失敗時に適切な `statusCode` を返しているか
- 受け取った入力をそのまま信用していないか

## このプロジェクトでの使い方

- STEP18 で注文登録 Lambda を作る
- STEP19 で注文取得 Lambda を作る
- STEP20 で更新・削除 Lambda を作る
- STEP21 で API Gateway と接続する

## 学習時の観点

- 画面から直接 DynamoDB を触らない
- 画面から直接 AWS SDK を呼ばない
- Lambda には UI の都合を持ち込まない
- 入力と出力の契約を明示する

