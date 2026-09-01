# STEP37 注文処理ワークフロー

この手順書は、STEP36 で作った Step Functions を、注文登録イベントから自動起動する業務フローとして使うための実施手順である。

このSTEPでは、`OrderCreated` を受けて注文処理ワークフローを開始し、注文スナップショットをそのままワークフローに流す。

## 目的

- `OrderCreated` から Step Functions を自動起動する
- 注文スナップショットをワークフローに渡す
- ワークフローの実行履歴を EventBridge 起点で追えるようにする
- 将来の承認、帳票、外部連携に分岐しやすい土台を作る

## 前提

- STEP32 で EventBridge bus が作成されている
- STEP33 で通知処理が動いている
- STEP34 で SQS キューが動いている
- STEP35 で DLQ が設定されている
- STEP36 で `oms-dev-order-processing-workflow` が作成されている

## このSTEPで扱う範囲

このSTEPでは次の構成を追加する。

- `OrderCreated` を受けて state machine を開始する EventBridge rule
- 注文スナップショットを受ける workflow input
- コンソール上での起動確認
- EventBridge からの自動起動確認

## 1. ワークフローの役割を決める

このSTEPでは、Step Functions を注文登録後の後続処理の起点として扱う。

役割:

- 注文イベントを受ける
- 注文情報をワークフロー入力として保持する
- 途中の処理結果をログに残す
- 将来の追加タスクに接続しやすい形にする

## 2. EventBridge から自動起動する

`infra/lib/order-api-stack.js` に `OrderCreated` 用の EventBridge rule を追加する。

推奨ルール名:

- `oms-dev-order-processing-workflow`
- `oms-prod-order-processing-workflow`

### 入力の考え方

EventBridge の `detail` に入っている注文スナップショットを、そのままワークフロー入力に渡す。

例:

```json
{
  "workflow": "order-processing",
  "detailType": "OrderCreated",
  "orderId": "ORD-TEST-001",
  "eventId": "evt-test-001",
  "customerName": "テスト顧客",
  "customerEmail": "test@example.com",
  "paymentMethod": "credit-card",
  "shippingAddress": "東京都港区1-2-3",
  "status": "pending",
  "totalAmount": 5000,
  "shouldFail": false,
  "shouldFailInvoice": false,
  "source": "oms.orders"
}
```

## 3. ワークフロー用の入力を確認する

ワークフローは次の情報を保持する。

- `workflow`
- `source`
- `detailType`
- `orderId`
- `eventId`
- `customerName`
- `customerEmail`
- `paymentMethod`
- `shippingAddress`
- `status`
- `totalAmount`
- `shouldFailInvoice`

### 確認ポイント

- Step Functions の実行入力に注文スナップショットが残る
- CloudWatch Logs で注文情報を追える
- `prepare` / `finalize` の両方で同じ注文文脈が見える

## 4. 動作確認

### 4.1 コンソールで確認する

1. AWS コンソールで `Step Functions` を開く
2. リージョンを `ap-northeast-1` にする
3. `oms-dev-order-processing-workflow` を開く
4. `実行を開始` で次の入力を送る

```json
{
  "workflow": "order-processing",
  "detailType": "OrderCreated",
  "orderId": "ORD-TEST-001",
  "eventId": "evt-test-001",
  "customerName": "テスト顧客",
  "customerEmail": "test@example.com",
  "paymentMethod": "credit-card",
  "shippingAddress": "東京都港区1-2-3",
  "status": "pending",
  "totalAmount": 5000,
  "shouldFail": false,
  "shouldFailInvoice": false,
  "source": "oms.orders"
}
```

確認ポイント:

- `Succeeded` になる
- `prepare` と `finalize` が順に動く
- 実行入力に注文情報が残る

### 4.2 EventBridge から確認する

`OrderCreated` を実際に送って、ワークフローが自動起動することを確認する。

#### CLI 例

```bash
aws events put-events \
  --entries '[
    {
      "Source": "oms.orders",
      "DetailType": "OrderCreated",
      "Detail": "{\"orderId\":\"ORD-TEST-001\",\"eventId\":\"evt-test-001\",\"customerName\":\"テスト顧客\",\"customerEmail\":\"test@example.com\",\"paymentMethod\":\"credit-card\",\"shippingAddress\":\"東京都港区1-2-3\",\"status\":\"pending\",\"totalAmount\":5000}"
    }
  ]' \
  --event-bus-name oms-dev-order-events \
  --region ap-northeast-1 \
  --profile oms-dev
```

#### 確認ポイント

- `oms-dev-order-processing-workflow` の実行が自動で 1 件増える
- 実行入力に `OrderCreated` の内容が入る
- CloudWatch Logs に注文スナップショットが出る

### 4.3 アプリから確認する

注文登録画面または API から注文を 1 件登録し、`OrderCreated` が EventBridge に送られることを確認する。

確認ポイント:

- 注文登録が成功する
- Notification Lambda が起動する
- SQS にもメッセージが流れる
- Step Functions の実行が自動で開始される

## 5. よくある失敗

### ワークフローが起動しない

確認すること:

- EventBridge rule が `OrderCreated` に一致しているか
- `source` が `oms.orders` か
- state machine 名が正しいか

### 実行入力が足りない

確認すること:

- EventBridge rule の input mapping が正しいか
- `detail` に `orderId` や `eventId` が含まれているか
- Lambda 側で必要な注文情報を返しているか
- `shouldFailInvoice` が通常経路で `false` に補われているか

### 実行は始まるが内容が空

確認すること:

- `detail` から `customerName` などを取り出せているか
- コンソール実行ではなく EventBridge ルール経由の入力を確認しているか

## 6. 完了条件

次を満たせば STEP37 は完了である。

- `OrderCreated` を受けて Step Functions が自動起動する
- 注文スナップショットが workflow input として残る
- コンソール実行と EventBridge 起動の両方を確認できる
- 通常経路では `shouldFailInvoice` 不足による失敗が起きない
- 実行ログから注文処理の流れを追える

## 7. 次のSTEP

STEP37 が完了したら、STEP38 で非同期処理の監視を整える。
