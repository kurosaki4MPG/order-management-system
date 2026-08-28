# STEP35 DLQ設計

この手順書は、STEP34 で導入した SQS / Lambda の非同期処理に対して、失敗メッセージの逃がし先として DLQ を設計・作成するための実施手順である。

このSTEPでは、通常キューに失敗が溜まり続ける状態を防ぎ、障害調査と再処理をしやすくする。

## 目的

- 失敗メッセージの逃がし先を用意する
- リトライ回数を定義する
- 失敗時にどこを確認するかを決める
- 再処理の流れを明確にする
- 次の Step Functions 導入に向けて障害耐性を上げる

## 前提

- STEP34 で SQS の通常キューと Consumer Lambda が作成されている
- 失敗時の一次受けとして SQS を使っている
- AWS CLI の `oms-dev` または `oms-prod` プロファイルが利用できる

## このSTEPで扱う範囲

このSTEPでは次の 2 つのキューを扱う。

- 通常キュー: `oms-<stage>-order-processing-queue`
- DLQ: `oms-<stage>-order-processing-dlq`

まずは 1 つの通常キューに対して 1 つの DLQ を対応づける。

## 1. DLQ の役割を決める

DLQ は次の目的で使う。

- Lambda が何度試しても処理できないメッセージを隔離する
- 障害メッセージを通常処理から切り離す
- 調査対象を保持する

DLQ は業務処理の本体ではない。
まずは「失敗を取りこぼさないための保管庫」として扱う。

## 2. DLQ を作る

標準キューとして DLQ を作成する。

### CLI 例

```bash
aws sqs create-queue \
  --queue-name oms-dev-order-processing-dlq \
  --attributes MessageRetentionPeriod=1209600 \
  --region ap-northeast-1 \
  --profile oms-dev
```

### 確認

```bash
aws sqs get-queue-url \
  --queue-name oms-dev-order-processing-dlq \
  --region ap-northeast-1 \
  --profile oms-dev
```

## 3. 通常キューに redrive policy を設定する

通常キューが一定回数失敗したら DLQ に送るようにする。

### 推奨値

- maxReceiveCount: `3`
- visibility timeout: `30` 秒前後
- メッセージ保持期間: `4日` 前後

### 設定の考え方

- 少なすぎると一時的な障害で DLQ に落ちやすい
- 多すぎると失敗メッセージが滞留しやすい
- 学習環境では `3` を基準にする

### CLI 例

DLQ の ARN を取得したうえで、通常キューに redrive policy を付ける。

```bash
aws sqs set-queue-attributes \
  --queue-url <通常キューURL> \
  --attributes RedrivePolicy='{"deadLetterTargetArn":"<DLQ ARN>","maxReceiveCount":"3"}' \
  --region ap-northeast-1 \
  --profile oms-dev
```

## 4. Consumer Lambda の失敗時挙動を確認する

Consumer Lambda が失敗すると、SQS は再試行する。
最終的に `maxReceiveCount` を超えると DLQ に移る。

### 確認ポイント

- Lambda が例外を投げた場合にメッセージが消えない
- 再試行の後に DLQ に送られる
- DLQ に入ったメッセージが CloudWatch Logs と突合できる

## 5. DLQ の確認方法を決める

DLQ は定期確認する。

### 確認内容

- DLQ にメッセージがあるか
- 何件溜まっているか
- どの `detail-type` が落ちているか
- `orderId` と `eventId` が何か

### CLI 例

```bash
aws sqs get-queue-attributes \
  --queue-url <DLQ URL> \
  --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
  --region ap-northeast-1 \
  --profile oms-dev
```

### AWS コンソールでの確認

1. AWS コンソールで `SQS` を開く
2. `oms-dev-order-processing-dlq` を選ぶ
3. `Overview` で `利用可能なメッセージ` を確認する
4. `送受信メッセージ` でメッセージ本文を確認する
5. 必要なら `CloudWatch Logs` で Consumer Lambda の失敗ログと突き合わせる

`利用可能なメッセージ` は近似値であり、SQS の分散特性のため多少前後することがある。

### テストメッセージの例

DLQ 到達確認では、Consumer Lambda が期待する EventBridge 形式を壊したメッセージを送る。

```json
{"hello":"world"}
```

これは `detail-type`、`detail.orderId`、`detail.eventId` を持たないため、Consumer Lambda が例外を投げる。

EventBridge っぽいが不正な例としては次も使える。

```json
{
  "detail-type": "OrderCreated",
  "detail": {
    "orderId": "ORD-TEST-001"
  }
}
```

この場合は `eventId` がないため失敗する。

### SQS コンソールでの送信確認

1. `oms-dev-order-processing-queue` を開く
2. `送受信メッセージ` を選ぶ
3. `メッセージを送信` で上の JSON を入れる
4. 送信後、Consumer Lambda の CloudWatch Logs を確認する
5. 可視性タイムアウトと `maxReceiveCount=3` を経た後、DLQ の `利用可能なメッセージ` が増えることを確認する

`STEP34` で使う正常系メッセージは、STEP34 の「正常系メッセージの確認」にまとめてある。

## 6. 再処理の流れを決める

DLQ に入ったメッセージは、手動で戻すか、別の再処理 Lambda で戻す。

このSTEPでは、まず手動再処理でよい。

### 手動再処理の流れ

1. DLQ からメッセージを取得する
2. `detail-type` と `detail` を確認する
3. 原因を CloudWatch Logs で確認する
4. 問題を修正する
5. メッセージを通常キューへ再投入する

## 7. EventBridge / SQS / Lambda の責務を整理する

- EventBridge: 業務イベントの配送
- SQS: 一時保管と平準化
- Lambda: 実際の処理
- DLQ: 失敗メッセージの隔離

## 7.1 実地確認の手順

1. 通常キュー `oms-dev-order-processing-queue` に不正 JSON を送る
2. Consumer Lambda の失敗ログを確認する
3. 数分待って DLQ `oms-dev-order-processing-dlq` の `利用可能なメッセージ` を確認する
4. DLQ に 1 件以上入っていれば、redrive policy と DLQ の動作確認は完了とする

## 8. 監視観点を決める

DLQ で最優先する監視は次の 2 つである。

- DLQ メッセージ数
- 通常キューの滞留数

必要に応じて CloudWatch Alarm を付ける。

## 9. よくある失敗

### メッセージが DLQ に流れない

確認すること:

- redrive policy が通常キューに設定されているか
- `maxReceiveCount` が設定されているか
- Consumer Lambda が失敗しているか

### DLQ に溜まるだけで処理できない

確認すること:

- 原因となる Lambda 例外が修正されているか
- 通常キューへ戻す手順があるか
- どのイベントが壊れているか識別できるか

### どのメッセージが落ちたか分からない

確認すること:

- イベントに `eventId` があるか
- `orderId` が含まれているか
- CloudWatch Logs に同じ ID を出しているか

## 10. 完了条件

次を満たせば STEP35 は完了である。

- 通常キューに対応する DLQ が作成されている
- redrive policy が設定されている
- 失敗メッセージが DLQ に逃げる
- DLQ の件数を確認できる
- 再処理手順が決まっている

## 11. 次のSTEP

STEP35 が完了したら、STEP36 で Step Functions を導入する。
