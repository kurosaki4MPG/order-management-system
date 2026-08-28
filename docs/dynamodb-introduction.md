# STEP22 DynamoDB導入

このステップでは、注文データを DynamoDB で扱う前提を整理する。

## 目的

- DynamoDB の役割を理解する
- 注文データの item 設計を決める
- アクセスパターンに合わせたキー設計を考える
- Lambda から Repository 層経由でアクセスする構造にする

## 役割

DynamoDB は、注文データの永続化を担う。
このプロジェクトでは、注文の読み書きが中心なので、RDB のような複雑な join よりも、アクセスパターンを先に決める設計が重要になる。

## このプロジェクトのアクセスパターン

- 注文一覧を取得する
- 注文 ID で 1 件取得する
- ステータスで絞り込む
- 注文を登録する
- 注文を更新する
- 注文を削除する

## テーブル設計の考え方

最初の実装では、注文を 1 item として保存する。

### 主要キー

- Partition Key: `orderId`
- Sort Key: なし

### 代表的な属性

- `orderId`
- `orderedAt`
- `customerName`
- `customerEmail`
- `shippingAddress`
- `status`
- `paymentMethod`
- `items`
- `totalAmount`

## 将来の拡張

ステータスや注文日での一覧取得が増えたら、次のような GSI を検討する。

- `status` をキーにした GSI
- `orderedAt` をキーにした GSI

## Repository 層

Lambda から DynamoDB に直接依存させず、Repository 層を挟む。

- `src/features/orders/repositories/order-repository.ts`
- `src/features/orders/repositories/dynamo-db-order-repository.ts`

注文データは DynamoDB 実装で扱い、Repository 層の内側で item 形状を吸収する。

## 実務上の観点

- まずアクセスパターンを決める
- item の形を先に固定する
- 必要になってから GSI を追加する
- クライアントから合計金額や status を信用しない
