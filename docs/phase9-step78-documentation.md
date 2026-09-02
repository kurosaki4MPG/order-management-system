# STEP78 ドキュメント作成

## 1. 目的

注文管理システムの仕様、実装、運用、障害対応を第三者が追える形にまとめる。  
このSTEPでは、既存の設計書と手順書をつないで、リポジトリだけを見ても全体像が分かる状態を作る。

---

## 2. 前提条件

- STEP74, STEP75, STEP76, STEP77 が完了している
- 実装コードとテストが最新である
- Phase 1 から Phase 9 までの資料が揃っている

---

## 3. 整理する対象

### 3.1 入口になる資料

- [phase-index.md](./phase-index.md)
- [design-index.md](./design-index.md)
- [order-system-learning-context.md](./order-system-learning-context.md)
- [phase9-final-integration.md](./phase9-final-integration.md)
- [phase9-final-integration-design.md](./phase9-final-integration-design.md)

### 3.2 実施手順の中心資料

- [phase9-step74-full-integration.md](./phase9-step74-full-integration.md)
- [phase9-step75-order-management-workflow.md](./phase9-step75-order-management-workflow.md)
- [phase9-step76-nonfunctional-review.md](./phase9-step76-nonfunctional-review.md)
- [phase9-step77-load-failure-testing.md](./phase9-step77-load-failure-testing.md)

### 3.3 関連する基礎資料

- [phase1-frontend-foundation.md](./phase1-frontend-foundation.md)
- [phase2-backend-aws.md](./phase2-backend-aws.md)
- [phase3-cdk-iac.md](./phase3-cdk-iac.md)
- [phase4-event-driven.md](./phase4-event-driven.md)
- [phase5-react-pdf.md](./phase5-react-pdf.md)
- [phase6-testing.md](./phase6-testing.md)
- [phase7-github-actions-cicd.md](./phase7-github-actions-cicd.md)
- [phase8-auth-security-ops.md](./phase8-auth-security-ops.md)

---

## 4. このSTEPで追記する内容

### 4.1 README

- システムの概要
- 主要機能
- ローカル起動手順
- テストの実行方法
- AWS デプロイの入口
- 認証が必要な画面の注意点
- Phase / Design / 学習コンテキストへの入口

### 4.2 設計書

- フロント、API、AWS の責務分担
- 注文処理の流れ
- 帳票出力の流れ
- 認証、監視、障害対応の考え方

### 4.3 手順書

- 各 STEP の実施内容
- 確認手順
- 失敗時の見え方
- 復旧時の確認内容

### 4.4 運用メモ

- CloudWatch Logs / Alarm の見方
- Step Functions / SQS / DLQ の確認順
- Cognito ログイン時の注意点
- S3 保存と署名付き URL の確認方法
- 実機確認結果を参照できる STEP77 の記録

---

## 5. 整理の方針

- 1 つの話題につき入口を 1 つに絞る
- 詳細な手順は各 STEP に寄せる
- 仕様の説明と実施結果を混ぜない
- 画面、API、AWS の説明を分ける
- 既に完了した内容は「実施済み」と分かるように残す

---

## 6. 確認観点

- 第三者がどの順に読めばよいか分かる
- STEP ごとの役割が重複していない
- どの資料に何が書いてあるか説明できる
- 実施結果と設計方針が混ざっていない

---

## 7. 完了条件

- README、設計書、手順書の入口が整理されている
- Phase ごとの資料が相互参照できる
- 実施した STEP の確認結果を追える
- 新しく参加した人が迷わず資料に入れる

---

## 8. 実施メモ

- STEP77 までの結果を踏まえ、運用・障害対応の説明を文書に反映する
- 画面操作、API、AWS の説明は、それぞれの責務が見えるように分けて書く
- 追記の粒度は「後から実施できる」レベルを維持する
- README は学習案件の入口として再構成し、詳細な説明は docs 配下へ寄せる
- Phase / Design / 学習コンテキストを相互リンクし、どこから読んでも迷いにくい構成にする
