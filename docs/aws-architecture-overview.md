# 注文管理システム 最終構成図

```mermaid
%%{init: {"theme":"base","flowchart":{"nodeSpacing":70,"rankSpacing":90,"curve":"linear"},"themeVariables":{"fontSize":"18px","fontFamily":"Segoe UI, Hiragino Sans, Yu Gothic, sans-serif"}}}%%
flowchart TB
  browser["ブラウザ"] --> nextjs["Next.js フロントエンド"]

  subgraph A[AWS バックエンド]
    direction TB
    apigw["HTTP API Gateway<br/>oms-stage-order-api"]
    orderLambda["Lambda<br/>oms-stage-order-api"]
    dynamodb["DynamoDB<br/>oms-stage-orders"]
    eventbridge["EventBridge<br/>oms-stage-order-events"]
    notificationLambda["通知 Lambda<br/>oms-stage-order-notification"]
    sns["SNS Topic<br/>oms-stage-order-notifications"]
    sqs["SQS Queue<br/>oms-stage-order-processing-queue"]
    dlq["DLQ<br/>oms-stage-order-processing-dlq"]
    queueConsumer["Queue Consumer<br/>oms-stage-order-queue-consumer"]
  end

  nextjs --> apigw
  apigw --> orderLambda
  orderLambda --> dynamodb
  orderLambda --> eventbridge
  eventbridge --> notificationLambda --> sns
  eventbridge --> sqs --> queueConsumer
  sqs -.-> dlq

```

## 要点

- フロントエンドは Next.js、バックエンドは AWS です。
- 同期系は `HTTP API Gateway -> Lambda -> DynamoDB` で処理します。
- 非同期系は `EventBridge -> 通知 Lambda -> SNS` と `EventBridge -> SQS -> Queue Consumer` に分かれます。
- 失敗メッセージは `SQS -> DLQ` に退避します。
