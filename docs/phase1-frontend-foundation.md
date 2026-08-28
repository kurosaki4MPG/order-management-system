# Phase 1 フロントエンド基盤

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

## 進め方

各STEPは「ユーザーが実作業する」前提で記載する。
こちらは、作業指示、確認観点、NG例、完了条件を示す。

## STEP1 開発環境の準備

実施内容:
- Node.js のバージョンを確認する
- npm を利用できることを確認する
- Git を利用できることを確認する
- VS Code などのエディタを準備する

確認観点:
- `node -v` が動く
- `npm -v` が動く
- `git --version` が動く

完了条件:
- 開発に必要な基本ツールが揃っている

## STEP2 Next.jsプロジェクト作成

実施内容:
- Next.js を App Router / TypeScript / ESLint / Tailwind で作成する
- プロジェクト名を決める
- 作成直後にローカル起動する

確認観点:
- `npm run dev` で起動する
- ブラウザでトップページが表示される

完了条件:
- Next.js の初期画面が確認できる

## STEP3 shadcn/ui導入

実施内容:
- `npx shadcn@latest init` を実行する
- `components.json` を確認する
- 必要なUI部品を追加する

確認観点:
- `button` や `card` が追加できる
- `components/ui` が生成される

完了条件:
- shadcn/ui を使う準備ができている

## STEP4 フロントエンドライブラリ導入

実施内容:
- React Hook Form を追加する
- Zod を追加する
- TanStack Query を追加する
- Axios を追加する
- date-fns を追加する

確認観点:
- `package.json` に依存関係が入る
- `npm run lint` が通る

完了条件:
- フォーム、バリデーション、API通信の土台ができている

## STEP5 ディレクトリ構成

実施内容:
- `components/`, `features/`, `lib/`, `hooks/`, `types/` を整理する
- 注文機能を `features/orders` 配下にまとめる

確認観点:
- 機能単位でファイルを置ける
- 共通処理と機能別処理が分離されている

完了条件:
- 保守しやすい構成ができている

## STEP6 Import Alias確認

実施内容:
- `tsconfig.json` の `@/*` を確認する
- 絶対パス import に揃える

確認観点:
- `@/components/...` の import が使える

完了条件:
- パスの深さに依存しない import が使える

## STEP7 Git初期設定

実施内容:
- `git status` で状態を確認する
- 初回コミットを作成する

確認観点:
- コミット履歴が残る

完了条件:
- 作業の起点となる Git 履歴が作られている

## STEP8 動作確認

実施内容:
- `npm run dev`
- `npm run lint`
- `npm run build`

確認観点:
- 起動、lint、build が通る

完了条件:
- 初期プロジェクトとして安定している

## STEP9 GitHubリポジトリ準備

実施内容:
- GitHub へ push する
- 必要なら main ブランチ保護を検討する

確認観点:
- リモートに反映される

完了条件:
- チーム共有可能な状態になる

## STEP10 共通レイアウト作成

実施内容:
- `AppShell` を作る
- ヘッダーとサイドバーを作る
- `/`, `/orders`, `/orders/new` を仮配置する

確認観点:
- レスポンシブで壊れない
- サイドバーの active 表示が動く

完了条件:
- 画面遷移の骨組みが完成している

## STEP11 注文一覧画面

実施内容:
- 一覧カードとテーブルを作る
- 仮データで表示する
- 追加・詳細への導線を置く

確認観点:
- リストが見やすい
- 空状態を考慮する

完了条件:
- 一覧画面として成立している

## STEP12 注文登録画面

実施内容:
- フォーム項目を決める
- React Hook Form + Zod を接続する
- 入力エラーを表示する

確認観点:
- 必須チェックが動く
- UI が崩れない

完了条件:
- 登録フォームの骨格がある

## STEP13 注文詳細画面

実施内容:
- 注文の基本情報を表示する
- 商品明細と合計金額を表示する
- 編集導線を置く

確認観点:
- 1件の注文を見やすく表示できる

完了条件:
- 詳細画面として成立している

## STEP14 注文編集画面

実施内容:
- 登録画面を編集モードに拡張する
- 初期値を再利用する
- 更新フォームの確認を行う

確認観点:
- 既存値を編集できる

完了条件:
- 登録と更新の差分が扱える

## STEP15 フロントエンドAPI通信設計

実施内容:
- API Base URL の持ち方を決める
- `GET /orders`
- `GET /orders/{id}`
- `POST /orders`
- `PATCH /orders/{id}`
- `DELETE /orders/{id}`

確認観点:
- UI から API を呼ぶ責務が分離されている

完了条件:
- 画面とAPIの接続設計が固まっている

