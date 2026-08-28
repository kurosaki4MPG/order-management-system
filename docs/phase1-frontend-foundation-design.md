# Phase 1 詳細設計書

## 1. 目的

注文管理システムのフロントエンド基盤を整える。
このPhaseでは、画面遷移、共通レイアウト、フォーム、API接続の土台を作る。

対象STEP:
- STEP1 開発環境の準備
- STEP2 Next.jsプロジェクト作成
- STEP3 shadcn/ui導入
- STEP4 フロントエンドライブラリ導入
- STEP5 ディレクトリ構成
- STEP6 Import Alias確認
- STEP7 Git初期設定
- STEP8 動作確認
- STEP9 GitHubリポジトリ準備
- STEP10 共通レイアウト作成
- STEP11 注文一覧画面
- STEP12 注文登録画面
- STEP13 注文詳細画面
- STEP14 注文編集画面
- STEP15 フロントエンドAPI通信設計

---

## 2. 全体方針

- App Router を前提とする
- 画面実装は `features/orders` に寄せる
- UI は shadcn/ui を基盤にする
- 画面状態は React Hook Form と TanStack Query で扱う
- API 呼び出しは `lib/api-client.ts` へ集約する
- フロントエンドは「表示」と「通信」を分離する

---

## 3. アーキテクチャ

```text
app/
  -> layouts
  -> pages
features/orders/
  -> components
  -> hooks
  -> schemas
  -> services
  -> types
lib/api-client.ts
```

### 3.1 責務

| 層 | 責務 |
| --- | --- |
| App Router | ルーティングとページ構成 |
| Layout | 共通ナビゲーション、シェル |
| Feature | 注文機能のUI、状態、型 |
| lib | API 通信、共通ユーティリティ |
| Schema | 入力検証、API 入出力の型制約 |

---

## 4. UI設計

### 4.1 共通レイアウト

- ヘッダー
- サイドバー
- メインコンテンツ
- レスポンシブ対応

### 4.2 画面一覧

- ダッシュボード
- 注文一覧
- 注文登録
- 注文詳細
- 注文編集

### 4.3 画面遷移

- 一覧 -> 詳細
- 一覧 -> 登録
- 詳細 -> 編集
- 詳細 -> 一覧
- 登録成功 -> 一覧
- 編集成功 -> 詳細または一覧

---

## 5. フォーム設計

### 5.1 入力項目

- 顧客名
- メールアドレス
- 送付先住所
- 支払方法
- 商品明細

### 5.2 バリデーション

- 必須項目を明確にする
- 金額と数量は数値として検証する
- メールアドレス形式を検証する
- 商品明細は最低1件以上を必須とする

### 5.3 編集時の初期値

- 詳細画面の注文情報を初期値として再利用する
- 編集専用の画面状態は最小限にする

---

## 6. API接続設計

### 6.1 API Base URL

- ローカル開発時は Next.js API Route Handler を利用する
- AWS 接続時は `NEXT_PUBLIC_API_BASE_URL` を利用する

### 6.2 対象API

- `GET /orders`
- `GET /orders/{id}`
- `POST /orders`
- `PATCH /orders/{id}`
- `DELETE /orders/{id}`

### 6.3 設計方針

- UI は URL 切替を意識しない
- API client が prefix の差を吸収する
- API の成功レスポンス形を画面で統一して扱う

---

## 7. データモデル

### 7.1 Order

- `orderId`
- `customerName`
- `customerEmail`
- `shippingAddress`
- `paymentMethod`
- `items`
- `totalAmount`
- `status`
- `createdAt`
- `updatedAt`

### 7.2 OrderItem

- `name`
- `quantity`
- `unitPrice`

---

## 8. 状態管理

### 8.1 使い分け

- フォーム中の入力値は React Hook Form
- API 取得結果は TanStack Query
- ローカル UI 状態は useState
- 画面横断状態は極力持たない

### 8.2 再取得方針

- 登録後は一覧再取得
- 編集後は詳細または一覧を再取得
- 削除後は一覧へ戻る

---

## 9. エラー設計

- バリデーションエラーはフォーム上に表示する
- API エラーはトーストまたはインラインで表示する
- `404` は詳細画面で「見つからない」と案内する
- `500` は共通エラーとして扱う

---

## 10. ファイル配置方針

```text
features/orders/
  components/
  hooks/
  schemas/
  services/
  types/
lib/
components/layouts/
```

### 10.1 ルール

- UI は components
- データ取得は hooks
- API 呼び出しは services
- 型は types
- バリデーションは schemas

---

## 11. 実装時の判断基準

- 再利用するものは feature 内に閉じる
- 画面固有ロジックを共通化しすぎない
- API 契約を先に固定する
- フロントはサーバー側のスナップショットをそのまま表示できるようにする

---

## 12. 完了条件

- 主要画面が揃っている
- API 通信の設計が固まっている
- 入力検証と表示更新の流れが整っている
- Next.js と AWS API の切り替え方針が決まっている

