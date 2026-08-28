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

確認観点:
- 長期キーなしで認証できる

完了条件:
- GitHub から AWS へ安全に接続できる

## STEP61 CDK自動デプロイ

実施内容:
- `cdk deploy` を workflow 化する
- stage ごとに切り替える

確認観点:
- 自動でインフラ更新できる

完了条件:
- IaC の自動反映ができる

## STEP62 環境別デプロイ

実施内容:
- dev / prod を分ける
- 手動承認の要否を決める

確認観点:
- 誤デプロイを防げる

完了条件:
- 環境ごとのフローができる

## STEP63 フロントエンドデプロイ

実施内容:
- フロントエンドのビルドと配信を定義する
- API URL を環境ごとに切り替える

確認観点:
- 画面を公開できる

完了条件:
- UI の配信が自動化される

## STEP64 ロールバック

実施内容:
- 障害時の戻し方を決める
- バージョンの切り戻し手順を作る

確認観点:
- 失敗時に戻せる

完了条件:
- 復旧手順が定義される

## STEP65 通知

実施内容:
- 成功/失敗を通知する
- 通知先を決める

確認観点:
- CI/CD の状態が見える

完了条件:
- 運用通知が届く
