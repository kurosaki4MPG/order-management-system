# STEP23 バックエンド設計整理

このステップでは、注文 API の責務とデータの流れを整理する。

## 全体の責務

```text
Next.js UI
  -> API client
  -> Next.js Route Handler または API Gateway
  -> Lambda handler
  -> Order service
  -> Order repository
  -> DynamoDB
```

開発中は Next.js Route Handler と Lambda が同じ Service / Repository を利用する。
永続化先を DynamoDB に変更するときも、HTTP 層と画面側の変更を最小限にする。

## 層ごとの責務

| 層 | 責務 | 持たせない責務 |
| --- | --- | --- |
| UI | 入力・表示・画面状態 | DynamoDB の操作 |
| API client | URL、HTTP メソッド、JSON の変換 | 業務ルール |
| Route Handler / API Gateway | HTTP 入力、認証・CORS の入口、HTTP 応答 | 永続化の詳細 |
| Lambda handler | イベント変換とユースケース呼び出し | 画面固有の状態管理 |
| Service | 注文登録・更新・削除の業務操作 | HTTP の詳細 |
| Repository | 注文の読み書き | HTTP ステータス |
| DynamoDB | データの永続化 | 入力値の妥当性判断 |

## API 契約

| Method | Path | 成功 | 主なエラー |
| --- | --- | --- | --- |
| GET | `/orders` | `200 { orders, total }` | `400` |
| GET | `/orders/{id}` | `200 { order }` | `404` |
| GET | `/orders/{id}/status` | `200 { status }` | `404` |
| POST | `/orders` | `201 { order }` | `400` |
| PATCH | `/orders/{id}` | `200 { order }` | `400`, `404` |
| PATCH | `/orders/{id}/status` | `200 { order }` | `400`, `404` |
| DELETE | `/orders/{id}` | `200 { deleted, orderId }` | `404` |

エラー応答は次の形にそろえる。

```json
{
  "error": "Order not found",
  "issues": {}
}
```

`issues` は入力検証エラーがある場合だけ返す。クライアントは HTTP ステータスを最初に確認し、成功レスポンスの形を前提に処理する。

## データの流れ

### 登録

1. API 層で JSON を受け取る
2. Zod スキーマで入力を検証する
3. Service が注文 ID、日時、合計金額を決める
4. Repository が注文を保存する
5. API 層が `201` を返す

### 更新・削除

1. パスから注文 ID を取得する
2. Repository で対象を確認する
3. Service 経由で更新または削除する
4. 対象がなければ `404` を返す

## 現在の実装と今後の差し替え

現在の Repository は `dynamoDbOrderRepository` である。注文データは DynamoDB に保存され、画面と API は同じ永続データを参照する。

```text
OrderRepository
  `- dynamoDbOrderRepository   (現在)
```

Service が Repository の具象実装を直接公開しないため、将来の保存先変更や検索条件の追加を Repository に閉じ込められる。

## 設計上の判断

- 入力検証は API の入口で行い、合計金額はサーバー側で再計算する
- HTTP ステータスは API 層が決め、Service は `undefined` や結果で表現する
- 一覧検索は初期段階では Repository のフィルタで実装する
- データ量が増えたら DynamoDB の Query と GSI に置き換える
- Next.js の Route Handler は開発用の BFF として扱い、本番の AWS API と契約を合わせる

## STEP24への接続点

- `NEXT_PUBLIC_API_BASE_URL` が設定されている場合は API Gateway を呼ぶ
- 未設定時は Next.js の `/api` を呼ぶ
- API client の呼び出し側は URL の切り替えを意識しない
