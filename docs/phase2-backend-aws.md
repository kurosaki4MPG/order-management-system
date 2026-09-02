# Phase 2 AWSサーバーレスバックエンド

対象STEP:
- STEP16 AWS開発環境準備
- STEP17 Lambda基礎
- STEP18 注文登録API
- STEP19 注文取得API
- STEP20 注文更新・削除API
- STEP21 API Gateway連携
- STEP22 DynamoDB導入
- STEP23 バックエンド設計整理
- STEP24 Next.jsとAWS APIの接続

## STEP16 AWS開発環境準備

実施内容:
- AWS アカウントを用意する
- IAM Identity Center / SSO を確認する
- 開発用プロファイルを作る
- `aws sts get-caller-identity` で確認する

確認観点:
- 認証が通る
- 目的のアカウントへ接続できる

完了条件:
- AWS CLI から開発アカウントへ接続できる

## STEP17 Lambda基礎

実施内容:
- Lambda の役割を理解する
- ハンドラーの入出力を確認する
- ローカルで関数を動かす

確認観点:
- APIレスポンスの形がわかる

完了条件:
- Lambda の基本動作を説明できる

## STEP18 注文登録API

実施内容:
- 入力スキーマを定義する
- 注文ID を生成する
- 合計金額をサーバー側で計算する
- バリデーションエラーを返す

確認観点:
- 400 と 201 を分けられる

完了条件:
- 注文登録APIの責務が明確になる

## STEP19 注文取得API

実施内容:
- 一覧取得を実装する
- 詳細取得を実装する
- 404 を返す条件を決める

確認観点:
- 一覧と詳細の責務が分かれている

完了条件:
- 取得APIの契約が固まる

## STEP20 注文更新・削除API

実施内容:
- 更新API を作る
- 削除API を作る
- ステータス更新を独立させる

確認観点:
- 更新と削除が別の操作として扱える

完了条件:
- CRUD の残りが揃う

## STEP21 API Gateway連携

実施内容:
- API Gateway を用意する
- Lambda proxy integration を使う
- CORS を設定する

確認観点:
- ブラウザから呼べる

完了条件:
- HTTP 経由で Lambda が起動する

## STEP22 DynamoDB導入

実施内容:
- テーブル設計を決める
- Repository 層を作る
- 注文データを DynamoDB で永続化する

確認観点:
- 永続化層を差し替えやすい

完了条件:
- 注文データを DynamoDB で扱う準備ができる

## STEP23 バックエンド設計整理

実施内容:
- Service / Repository / Handler を分離する
- エラー契約を整える
- API ルートを整理する

確認観点:
- レイヤ責務が混ざっていない

完了条件:
- バックエンド全体の骨格ができる

## STEP24 Next.jsとAWS APIの接続

実施内容:
- `NEXT_PUBLIC_API_BASE_URL` を使う
- フロントエンドの fetch / mutation を AWS API に向ける
- 詳細画面と削除処理を接続する

確認観点:
- 画面から実APIを叩ける

完了条件:
- フロントとAWSバックエンドが接続される

## 関連資料

- [api-gateway-integration.md](./api-gateway-integration.md)
- [api-gateway-cdk-setup.md](./api-gateway-cdk-setup.md)
- [order-management-system-api-design.md](./detailed-design/order-management-system-api-design.md)
- [frontend-api-list.md](./frontend-api-list.md)
- [lambda-basics.md](./lambda-basics.md)
- [lambda-cdk-setup.md](./lambda-cdk-setup.md)
- [dynamodb-introduction.md](./dynamodb-introduction.md)
- [dynamodb-cdk-setup.md](./dynamodb-cdk-setup.md)
- [order-registration-api.md](./order-registration-api.md)
- [order-retrieval-api.md](./order-retrieval-api.md)
- [order-update-delete-api.md](./order-update-delete-api.md)
