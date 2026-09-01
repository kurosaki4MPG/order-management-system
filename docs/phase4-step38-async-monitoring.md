# STEP38 非同期処理の監視

この手順書は、STEP34 から STEP37 で作った非同期処理を、CloudWatch Alarm と運用確認手順で監視できるようにするための実施手順である。

このSTEPでは、異常を早く見つけるために、DLQ、キュー滞留、Step Functions の失敗を監視対象にする。

## 目的

- DLQ の滞留を検知する
- SQS の処理遅延を検知する
- Step Functions の失敗を検知する
- どこを見るかを手順化する

## 前提

- STEP35 で DLQ が作成されている
- STEP36 で `oms-dev-order-processing-workflow` が作成されている
- STEP37 で `OrderCreated` からワークフローが自動起動する

## このSTEPで扱う範囲

このSTEPでは次の監視を追加する。

- DLQ の可視メッセージ数
- 通常キューの最古メッセージの経過時間
- Step Functions の失敗実行数

## 1. 監視対象を決める

監視対象は次の 3 つに絞る。

- DLQ にメッセージが溜まる
- 通常キューが詰まり始める
- Step Functions が失敗する

### 理由

- DLQ は失敗の確定地点なので、最優先で見る
- キュー滞留は処理遅延の前兆になる
- Step Functions の失敗は業務フローの中断を直接表す

## 2. CloudWatch Alarm を作る

`infra/lib/order-api-stack.js` に次のアラームを追加する。

### 2.1 DLQ アラーム

- 対象: `oms-${stage}-order-processing-dlq`
- 条件: 可視メッセージ数が `1` 以上
- 意味: 失敗メッセージが発生した

### 2.2 キュー滞留アラーム

- 対象: `oms-${stage}-order-processing-queue`
- 条件: 最古メッセージの経過時間が `300` 秒以上
- 意味: 処理が追いついていない

### 2.3 Step Functions 失敗アラーム

- 対象: `oms-${stage}-order-processing-workflow`
- 条件: 失敗実行数が `1` 以上
- 意味: ワークフローが途中で止まった

## 3. デプロイ後の確認

### 3.1 CloudWatch でアラームを見る

1. AWS コンソールで `CloudWatch` を開く
2. リージョンを `ap-northeast-1` にする
3. `Alarms` を開く
4. 次のアラームがあることを確認する
   - `oms-dev-order-processing-dlq-alarm`
   - `oms-dev-order-processing-backlog-alarm`
   - `oms-dev-order-processing-workflow-failed-alarm`

### 3.2 DLQ を確認する

DLQ 監視アラームが上がったら、SQS コンソールで `oms-dev-order-processing-dlq` を見る。

確認ポイント:

- `利用可能なメッセージ` が 0 より大きいか
- どのメッセージが落ちたか
- `orderId` と `eventId` が分かるか

### 3.3 キュー滞留を確認する

キュー滞留アラームが上がったら、`oms-dev-order-processing-queue` を見る。

確認ポイント:

- メッセージが残っていないか
- Consumer Lambda が失敗していないか
- 可視性タイムアウトが短すぎないか

### 3.4 Step Functions の失敗を確認する

Step Functions 失敗アラームが上がったら、`oms-dev-order-processing-workflow` の `Executions` を見る。

確認ポイント:

- どの入力で失敗したか
- `prepare` か `finalize` のどちらで止まったか
- CloudWatch Logs に例外が残っているか

## 4. よくある失敗

### アラームが出ない

確認すること:

- `dev` スタックに最新コードがデプロイされているか
- リージョンが `ap-northeast-1` か
- 監視対象のメトリクスが 5 分待っても更新されるか

### DLQ だけ見ると原因が分からない

確認すること:

- Consumer Lambda のログを見る
- Step Functions の `Executions` を見る
- `eventId` でイベントを突合する

### キューが詰まる

確認すること:

- Consumer Lambda が失敗していないか
- `maxReceiveCount` が想定通りか
- DLQ にメッセージが落ちていないか

## 5. 完了条件

次を満たせば STEP38 は完了である。

- DLQ アラームがある
- キュー滞留アラームがある
- Step Functions 失敗アラームがある
- どこを見るかの手順が決まっている

### 実地確認メモ

- 2026-08-26 時点で `oms-dev-order-processing-dlq-alarm` が `ALARM` になったが、DLQ のメッセージを削除後、しばらくして `OK` に戻ることを確認した
- CloudWatch の評価は即時ではなく、数分程度の遅延がありうる
- DLQ の `ApproximateNumberOfMessagesVisible` が 0 でも、アラーム状態がすぐには変わらない場合がある

## 6. まとめ

- DLQ、キュー滞留、Step Functions 失敗をそれぞれ別アラームで監視できるようにした
- 実際の確認では `oms-dev-order-processing-dlq-alarm` の遷移を見て、評価遅延があることも確認した
- CloudWatch と SQS / Step Functions の確認順を手順化し、障害時にどこを見るかを固定した

## 7. 次のSTEP

STEP38 が完了したら、Phase 4 の非同期処理は監視まで含めて一通りそろう。
