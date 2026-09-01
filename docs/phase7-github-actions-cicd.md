# Phase 7 GitHub Actions CI/CD

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

## STEP56 基本CI

実施内容:

- lint を実行する
- test を実行する
- build を実行する

実施結果:

- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) を追加し、`pull_request` と `main` への push で `lint / test / build` を実行するようにした
- ローカル確認で `npm run lint` と `npm run build` が通ることを確認した

確認観点:

- PR で品質確認が走る

完了条件:

- 最低限の CI が動く

## STEP57 依存関係キャッシュ

実施内容:

- npm キャッシュを設定する
- 実行時間を短縮する

実施結果:

- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) に `actions/setup-node` の `npm` キャッシュと `actions/cache` の `.next/cache` を追加した

確認観点:

- 2回目以降が速くなる

完了条件:

- CI の無駄が減る

## STEP58 セキュリティチェック

実施内容:

- `npm audit` を確認する
- 秘密情報の漏れをチェックする
- 依存関係の脆弱性を確認する

実施結果:

- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) に `npm audit --audit-level=high --omit=dev` と、コード・設定ファイルに対する secret-like pattern 検査を追加した

確認観点:

- 危険な変更が検知される

完了条件:

- セキュリティ観点が入る

## STEP59 Pull Request品質ゲート

実施内容:

- 必須チェックを定義する
- マージ条件を設定する

実施結果:

- [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md) を追加し、PR 作成時に `verify:ci` とレビュー依頼を確認できるようにした
- `CI` workflow を PR 時に実行し、`lint / test / build / npm audit / secret scan` を品質ゲートとして扱うようにした
- GitHub 側では `main` ブランチに対して CI 成功と review 必須を branch protection で有効化する前提にした

確認観点:

- 重要チェックなしでマージできない

完了条件:

- PR の品質が守られる

### 59.1 Pull Request 運用手順

1. 作業ブランチで変更を行う
2. `npm run verify:ci` を実行して、ローカルで CI 相当の確認を通す
3. 変更を push して Pull Request を作成する
4. PR テンプレートに沿って、変更内容・検証内容・チェック項目を埋める
5. GitHub Actions の `CI` が green になるまで待つ
6. `lint / test / build / npm audit / secret scan` の結果を確認する
7. 必要なレビューを依頼する
8. 指摘があれば修正し、再度 `verify:ci` を通してから push する
9. 必須チェックと review が揃ったらマージする

## STEP60 AWS認証（GitHub OIDC）

実施内容:

- OIDC provider を使う
- IAM ロールを作る
- Actions から AWS に接続する

実施結果:

- [`infra/lib/github-oidc-stack.js`](../infra/lib/github-oidc-stack.js) を追加し、GitHub OIDC provider と `dev` / `prod` の IAM role を CDK で作成するようにした
- [`.github/workflows/aws-oidc-check.yml`](../.github/workflows/aws-oidc-check.yml) を追加し、`workflow_dispatch` で `dev` / `prod` の OIDC 認証を確認できるようにした
- GitHub repository variables に `AWS_ROLE_ARN_DEV` と `AWS_ROLE_ARN_PROD` を置いて、環境ごとに AssumeRole 先を切り替える前提にした
- workflow の job に `environment: dev` / `environment: prod` を設定し、GitHub Environment ベースの `sub` と trust policy を一致させるようにした
- `aws-actions/configure-aws-credentials` で OIDC を使い、`aws sts get-caller-identity` で認証確認するようにした
- `OmsGithubOidcStack` をデプロイし、次の role ARN を取得した
  - `AWS_ROLE_ARN_DEV = arn:aws:iam::686910912663:role/oms-github-actions-dev`
  - `AWS_ROLE_ARN_PROD = arn:aws:iam::686910912663:role/oms-github-actions-prod`
  - OIDC provider ARN = `arn:aws:iam::686910912663:oidc-provider/token.actions.githubusercontent.com`

### 60.1 GitHub 側の準備

1. GitHub repository variables に次を設定する
   - `AWS_ROLE_ARN_DEV`
   - `AWS_ROLE_ARN_PROD`
2. AWS 側の CDK スタックで `token.actions.githubusercontent.com` を信頼する OIDC provider と IAM role を用意する
3. role の trust policy で `repo:kurosaki4MPG/order-management-system:environment:dev` / `prod` に限定する
4. dev / prod の role に必要最小限の権限を付与する
5. GitHub 側で `dev` / `prod` の Environment を作成し、必要なら保護ルールを設定する

### 60.2 確認方法

1. GitHub Actions の `AWS OIDC Check` を手動起動する
2. `stage=dev` で `aws sts get-caller-identity` が成功することを確認する
3. `stage=prod` でも同様に成功することを確認する
4. 失敗した場合は role ARN、trust policy、repository variables を見直す

### 60.3 実施まとめ

- AWS 側は CDK で GitHub OIDC provider と `dev` / `prod` の IAM role を作成した
- GitHub 側は repository variables に `AWS_ROLE_ARN_DEV` / `AWS_ROLE_ARN_PROD` を登録し、workflow で参照するようにした
- workflow は `environment: dev` / `environment: prod` を使って subject を role の trust policy と一致させた
- `AWS OIDC Check` を `stage=dev` / `stage=prod` の両方で実行し、`aws sts get-caller-identity` の成功を確認した
- 最終的な role ARN は次のとおり
  - `AWS_ROLE_ARN_DEV = arn:aws:iam::686910912663:role/oms-github-actions-dev`
  - `AWS_ROLE_ARN_PROD = arn:aws:iam::686910912663:role/oms-github-actions-prod`

確認観点:

- 長期キーなしで認証できる

完了条件:

- GitHub から AWS へ安全に接続できる

## STEP61 CDK自動デプロイ

実施内容:

- `cdk deploy` を workflow 化する
- stage ごとに切り替える

実施結果:

- [`.github/workflows/cdk-deploy.yml`](../.github/workflows/cdk-deploy.yml) を追加し、`main` への push で `dev` を自動デプロイするようにした
- `workflow_dispatch` でも起動できるようにし、`stage=prod` の手動デプロイに対応した
- GitHub Environment `dev` / `prod` と `AWS_ROLE_ARN_DEV` / `AWS_ROLE_ARN_PROD` を使って、deploy 先と OIDC の trust policy を揃えるようにした
- `npm ci` の後に `aws sts get-caller-identity` を確認し、その後 `npx cdk deploy` で `OmsdevOrderApiStack` / `OmsprodOrderApiStack` を反映するようにした
- `aws-cdk` を devDependency に追加し、GitHub Actions でも同じ CLI を使えるようにした
- `InvoicePdfBucket` は固定 bucket 名をやめ、CDK 管理の自動生成名に切り替えた。既存バケットとの衝突で `AWS::S3::Bucket` の作成に失敗していたためである

### 61.1 デプロイ手順

1. `main` に push すると `dev` が自動デプロイされる
2. `workflow_dispatch` で `stage=prod` を選ぶと `prod` を手動デプロイできる
3. `prod` は `cors_origins` を指定する
4. どちらの環境でも `aws sts get-caller-identity` で認証確認を行う

確認観点:

- 自動でインフラ更新できる

完了条件:

- IaC の自動反映ができる

## STEP62 環境別デプロイ

実施内容:

- dev / prod を分ける
- 手動承認の要否を決める

実施結果:

- [`.github/workflows/cdk-deploy.yml`](../.github/workflows/cdk-deploy.yml) で `main` push は `dev`、`workflow_dispatch` の `stage=prod` は `prod` に分けた
- GitHub Environment `dev` / `prod` を使って、環境ごとの OIDC subject とデプロイ先を一致させた
- `prod` は GitHub Environment の保護ルールでレビュー承認を入れる前提にし、workflow 側は手動起動にした
- `dev` は自動、`prod` は手動という運用により、誤って本番へ流すリスクを減らした
- 2026-08-28 に `workflow_dispatch` で `stage=prod` と `cors_origins=https://app.example.com` を指定して本番デプロイを実行し、`deploy-prod` が成功した

### 62.1 環境設定

1. GitHub で `dev` と `prod` の Environment を作成する
2. `prod` Environment には必要に応じて reviewer を設定する
3. `dev` Environment は自動実行を前提にする
4. `prod` は `workflow_dispatch` で明示的に選んだ場合のみ実行する

### 62.2 運用手順

1. 通常の変更は `main` への push で `dev` に反映される
2. `prod` へ反映する場合は workflow を手動起動し、`stage=prod` を選ぶ
3. `cors_origins` を本番 URL に設定する
4. 必要なら GitHub Environment の承認後にデプロイを進める
5. 2026-08-28 時点で `stage=prod` の本番デプロイが成功している

確認観点:

- 誤デプロイを防げる
- 本番デプロイを GitHub Actions から実行できる

完了条件:

- 環境ごとのフローができる
- `dev` と `prod` の workflow が実際に成功する

## STEP63 フロントエンドデプロイ

実施内容:

- フロントエンドのビルドと配信を定義する
- API URL を環境ごとに切り替える

実施結果:

- [`next.config.ts`](../next.config.ts) で `output: "standalone"` を有効にし、Next.js を Node.js サーバーとして配信できるようにした
- [`Dockerfile`](../Dockerfile) を追加し、`NEXT_PUBLIC_API_BASE_URL` を build 時に注入して環境ごとに異なる frontend image を作れるようにした
- [`.github/workflows/frontend-deploy.yml`](../.github/workflows/frontend-deploy.yml) を追加し、`main` push では `dev`、`workflow_dispatch` の `stage=prod` では `prod` の frontend image を GHCR に publish するようにした
- GitHub Environment `dev` / `prod` の `NEXT_PUBLIC_API_BASE_URL` を使い、API URL を環境別に切り替える構成にした

### 63.1 配信方式

1. Next.js は `standalone` 出力でビルドする
2. Docker image として配信する
3. GitHub Actions で image を GHCR に push する
4. `dev` と `prod` は異なる `NEXT_PUBLIC_API_BASE_URL` でビルドする

### 63.2 運用手順

1. GitHub Environment `dev` に開発用 API URL を設定する
2. GitHub Environment `prod` に本番用 API URL を設定する
3. `main` push で `dev` image が自動更新されることを確認する

## まとめ

- CI、PR 品質ゲート、GitHub OIDC、CDK 自動デプロイ、フロントエンド配信を段階的につないで、main への push と手動承認の役割を分けた
- `AWS_ROLE_ARN_DEV` / `AWS_ROLE_ARN_PROD`、`workflow_dispatch`、branch protection を使って、dev / prod の運用ルールを明確にした
- 詳細なデプロイ手順や確認方法は各 STEP の節に残し、総括はこの Phase に集約した
4. `workflow_dispatch` で `stage=prod` を選ぶと本番 image が更新される
5. 配信先ホストは GHCR の image を実行して Next.js サーバーを起動する

確認観点:

- 画面を公開できる
- 環境ごとに正しい API URL を参照できる

完了条件:

- UI の配信が自動化される
- frontend image の publish が自動化される

## STEP64 ロールバック

実施内容:

- 障害時の戻し方を決める
- バージョンの切り戻し手順を作る

実施結果:

- [`.github/workflows/frontend-rollback.yml`](../.github/workflows/frontend-rollback.yml) を追加し、`workflow_dispatch` で指定した `source_tag` を `dev-latest` / `prod-latest` に付け替えられるようにした
- frontend の本番復旧は、安定していた `prod-<sha>` を再指定して `prod-latest` を戻す手順にした
- CDK のロールバックは、直前の安定コミットへ `git revert` して `CDK Deploy` を再実行する運用にした

### 64.1 ロールバック手順

1. まず復旧対象を frontend か infrastructure かで分ける
2. frontend の場合は GHCR の安定 tag `dev-<sha>` または `prod-<sha>` を選ぶ
3. `frontend-rollback` workflow を手動起動し、`stage` と `source_tag` を指定する
4. `stage-latest` が安定 tag に付け替わったことを確認する
5. infrastructure の場合は `git revert` で戻し、`CDK Deploy` を再実行する

### 64.2 確認方法

1. GHCR 上で `stage-latest` が選んだ `source_tag` を参照していることを確認する
2. 実行中のアプリで戻したバージョンの画面が出ることを確認する
3. CDK の場合は `cdk deploy` 後に対象リソースが期待値へ戻ったことを確認する

確認観点:

- 失敗時に戻せる
- どの tag に戻したか追える

完了条件:

- 復旧手順が定義される
- frontend の切り戻し workflow がある

## STEP65 通知

実施内容:

- 成功/失敗を通知する
- 通知先を決める

実施結果:

- [`.github/workflows/ci-cd-notifications.yml`](../.github/workflows/ci-cd-notifications.yml) を追加し、`CI` / `CDK Deploy` / `Frontend Deploy` / `Frontend Rollback` の完了結果を GitHub Issue のコメントへ残すようにした
- 通知先は GitHub Issue `CI/CD 通知ログ` にし、リポジトリのメンテナとウォッチャーが履歴を追えるようにした
- 成功時と失敗時の両方を、workflow 名・branch・SHA・run URL とともに記録するようにした

### 65.1 通知先

1. GitHub Issue `CI/CD 通知ログ` を運用通知の集約先にする
2. issue のコメントで成功/失敗を残す
3. issue を watch しているメンバーが通知を受け取れるようにする

### 65.2 通知内容

1. workflow 名
2. 結果
3. branch
4. SHA
5. run URL

確認観点:

- CI/CD の状態が見える
- 成功/失敗が分かる

完了条件:

- 運用通知が届く
- 通知先が固定される
