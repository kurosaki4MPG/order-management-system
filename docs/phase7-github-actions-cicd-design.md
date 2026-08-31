# Phase 7 詳細設計書

## 1. 目的

注文管理システムのビルド、テスト、デプロイを GitHub Actions で自動化する。

対象STEP:

- STEP56 基本CI
- STEP57 依存関係キャッシュ
- STEP58 セキュリティチェック
- STEP59 Pull Request品質ゲート
- STEP60 AWS認証（GitHub OIDC）
- STEP61 CDK自動デプロイ
- STEP62 環境別デプロイ
- STEP63 フロントエンドデプロイ
- STEP64 ロールバック
- STEP65 通知

---

## 2. 基本方針

- PR 時に品質を確認する
- main へのマージでデプロイする
- AWS 認証は OIDC を使う
- 手動承認を必要に応じて入れる

---

## 3. CI 設計

### 3.1 実行内容

- lint
- test
- build
- 実装は [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) に置く

### 3.2 失敗時

- どのジョブが落ちたか分かる
- ログで原因が追える

---

## 4. キャッシュ設計

- npm キャッシュを使う
- 依存解決時間を短縮する
- CI の再実行コストを下げる
- GitHub Actions では `actions/setup-node` の `npm` キャッシュと `actions/cache` の `.next/cache` を使う

---

## 5. セキュリティチェック

- `npm audit --audit-level=high --omit=dev`
- 追跡済みのコード・設定ファイルに対する secret-like pattern チェック
- 必要に応じてコードスキャン

---

## 6. PR品質ゲート

- lint が通る
- test が通る
- build が通る
- 必要なら review 必須
- `npm audit --audit-level=high --omit=dev` が通る
- secret-like pattern チェックが通る
- GitHub の branch protection で `CI / lint / test / build` を必須チェックにする
- GitHub の branch protection で review required を有効にする

### 6.1 Pull Request 運用手順

- 変更前に `npm run verify:ci` を実行する
- PR にはテンプレートを使い、変更内容と検証内容を残す
- PR 作成後は CI の完了を待ち、失敗があれば修正して再実行する
- 必須チェックと review が揃ってからマージする

---

## 7. AWS 認証

- GitHub OIDC を使う
- 長期アクセスキーを持たない
- 環境ごとにロールを分ける
- `token.actions.githubusercontent.com` を信頼する IAM role を dev / prod で分ける
- trust policy は `repo:kurosaki4MPG/order-management-system:environment:dev` / `prod` に限定する
- GitHub repository variables に role ARN を保持し、workflow から参照する
- workflow 側は GitHub Environment を使い、`environment: dev` / `environment: prod` で role の subject と揃える
- `aws sts get-caller-identity` で認証の成功を確認する
- すでに `OmsGithubOidcStack` をデプロイし、dev / prod の role ARN を取得済みである

---

## 8. CDK デプロイ

- dev と prod を分ける
- `cdk deploy` を workflow に組み込む
- 必要なら manual approval を挟む
- `main` への push で dev を自動デプロイし、prod は `workflow_dispatch` で手動デプロイする
- prod は GitHub Environment の reviewer で承認を入れる
- `aws sts get-caller-identity` で認証を先に確認してから `cdk deploy` を実行する
- CDK CLI は devDependency として固定し、GitHub Actions でも同じバージョンを使う
- S3 のような既存リソースと衝突しやすいものは、必要がなければ固定名を持たせず CDK 管理に寄せる
- 2026-08-28 に `workflow_dispatch` の `stage=prod` 実行が成功し、prod デプロイの動作確認が完了した

---

## 9. フロントエンドデプロイ

- Next.js は `standalone` 出力でビルドする
- Docker image として配信する
- GitHub Actions で GHCR に publish する
- `NEXT_PUBLIC_API_BASE_URL` を環境ごとに変えてビルドする
- 配信先ホストは GHCR の image を実行して Next.js server を起動する

---

## 10. ロールバック

- frontend は GHCR の `stage-latest` を安定 tag に戻せるようにする
- `prod-<sha>` のような immutable tag を切り戻しの基準にする
- infrastructure は `git revert` と CDK 再デプロイで戻せるようにする
- どの commit / image tag に戻したかを残す

---

## 11. 通知

- 成功通知
- 失敗通知
- 対象者の明確化

---

## 12. Phase 7 の完了条件

- PR ベースで品質管理できる
- AWS 認証が安全にできる
- デプロイが自動化される
- 失敗時の戻し方が分かる
