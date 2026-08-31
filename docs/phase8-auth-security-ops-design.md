# Phase 8 詳細設計書

## 1. 目的

注文管理システムに認証、認可、最小権限、ログ、監視、障害対応を導入する。

対象STEP:
- STEP66 Cognito認証
- STEP67 認可
- STEP68 IAM最小権限
- STEP69 機密情報管理
- STEP70 APIセキュリティ
- STEP71 ログ設計
- STEP72 監視
- STEP73 障害対応

---

## 2. 認証

- Cognito Hosted UI を使ってログインする
- PKCE を使って code flow を回す
- `/api/auth/login` で Cognito へ遷移する
- `/api/auth/callback` で code を token に交換する
- `/api/auth/logout` でセッションを破棄する
- `proxy.ts` で未ログイン時の画面アクセスをログインへ誘導する
- フロントエンドと API の両方でトークンを扱う
- セッション管理の責務を整理する

---

## 3. 認可

- Cognito グループで権限を表現する
- `admin`
- `operator`
- `viewer`

の 3 役割を定義する。

権限の目安は次の通り。

- `admin`: 注文登録、更新、削除を許可する
- `operator`: 注文登録と更新を許可し、削除は許可しない
- `viewer`: 閲覧のみ許可する

API と UI の両方で権限を意識する。

---

## 4. IAM 最小権限

- Lambda は必要な `grant*` だけを持たせる
- CI/CD は CDK deploy に必要な `file-publishing-role` と `deploy-role` のみに絞る
- 運用者の権限は SSO / IAM ロールごとに分ける
- bootstrap の lookup role など、実運用で不要な引き受け権限は外す

過剰権限は監査対象とし、`cdk diff` と実際の deploy 成功で確認する。

---

## 5. 機密情報管理

- 環境変数
- SSM Parameter Store
- Secrets Manager

を用途で使い分ける。

---

## 6. API セキュリティ

- 入力検証
- 認証必須化
- CORS 制御
- レート制限
- エラーレスポンスの統一

---

## 7. ログ設計

- `requestId`
- `eventId`
- `orderId`
- `userId`

を追えるようにする。

ログは人が調査しやすい構造にする。

---

## 8. 監視

- CloudWatch アラーム
- Lambda エラー
- API 失敗率
- DLQ 件数
- SQS 滞留

を監視対象にする。

---

## 9. 障害対応

- どこを見るか
- どの順で切り分けるか
- どこで再実行するか
- 復旧後に何を確認するか

を定義する。

---

## 10. 実施順

Phase 8 は依存関係の強いものから順に進める。

1. STEP66 Cognito認証
   - ログイン基盤を先に作る
   - 以降の認可や API 制御の前提になる
2. STEP67 認可
   - ログイン後の権限制御を固める
   - UI と API の両方に反映する
3. STEP68 IAM最小権限
   - Lambda、CI/CD、運用者の権限を整理する
   - 後続の運用設計の土台にする
4. STEP69 機密情報管理
   - 環境変数と Secrets/SSM の使い分けを定義する
   - 認証や API 設定と整合させる
5. STEP70 APIセキュリティ
   - 認証・認可・CORS・入力検証を API に反映する
   - ここで外部からの防御線を固める
6. STEP71 ログ設計
   - 調査に必要な識別子を揃える
   - 次の監視に必要な観点を整える
7. STEP72 監視
   - CloudWatch アラームとメトリクスを設定する
   - 障害の早期検知を可能にする
8. STEP73 障害対応
   - 監視結果を前提に切り分け手順をまとめる
   - 復旧後確認まで含めて完成させる

---

## 11. Phase 8 の完了条件

- ログと監視で追跡できる
- 権限を最小化できる
- 障害時の対応手順がある
