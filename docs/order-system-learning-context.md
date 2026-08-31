# システム開発 学習プラン・ハンズオン コンテキスト

## 1. 目的

以下のスキルセットを前提として、実務レベルのシステム開発を一通り経験できる学習プランと、詳細なハンズオン手順を段階的に進める。

- Next.js (App Router) / Reactを用いたフロントエンドの開発・設計経験
- AWSサーバーレス環境でのバックエンド開発経験
- API Gateway / Lambda、およびEventBridge / Step Functionsを用いたイベント駆動・非同期処理の実装経験
- AWS CDK (TypeScript) を用いたIaCの実務経験
- Vitest / Jest等を用いたテストコードの適切な設計・モック戦略の理解
- GitHub Actionsを用いた高度なCI/CDパイプラインの構築経験
- React PDFを用いた帳票出力システムの開発経験

## 2. 想定する教材プロジェクト

注文管理システム（Order Management System）を題材にする。

主な機能:

- ダッシュボード
- 注文一覧
- 注文登録
- 注文詳細
- 注文編集
- AWSサーバーレスAPI
- DynamoDB
- EventBridgeによるイベント駆動処理
- SQS / DLQ
- Step Functionsによる注文処理ワークフロー
- React PDFによる帳票出力
- S3へのPDF保存
- テスト
- GitHub Actions CI/CD
- Cognito/IAM等による認証・認可
- CloudWatchによる監視

---

# 3. 現在のプロジェクト構成

Next.js作成時に「Recommended Next.js defaults」を選択。

現在は、`src`を使わずプロジェクトルートに`app`がある「パターン2」を採用する。

```text
order-system/
├── app/                       # Next.js App Router
├── components/
│   ├── common/
│   ├── forms/
│   ├── layouts/
│   └── ui/                    # shadcn/ui
├── features/
│   └── orders/
│       ├── components/
│       ├── hooks/
│       ├── schemas/
│       ├── services/
│       └── types/
├── hooks/
├── lib/
├── services/
├── types/
├── utils/
├── constants/
├── public/
├── components.json
├── next.config.ts
├── package.json
└── tsconfig.json
```

`src/app`は作成せず、ルートの`app`をApp Routerとして利用する。

---

# 4. shadcn/ui

Next.jsプロジェクト作成後、プロジェクトディレクトリへ移動してから初期化する。

```bash
cd order-system
npx shadcn@latest init
```

shadcn/ui導入時の方針:

- 業務システム向けの落ち着いたUI
- ベースカラーはNeutralを推奨
- 必要なコンポーネントを必要に応じて追加

追加した主なコンポーネント:

- button
- input
- label
- card
- table
- form
- dialog
- dropdown-menu
- select
- textarea
- badge
- tabs
- toast
- alert-dialog
- sheet
- separator
- scroll-area
- skeleton
- pagination
- avatar
- tooltip
- sidebar

特にSTEP10では以下を使用:

```bash
npx shadcn@latest add button separator sheet tooltip avatar
npx shadcn@latest add sidebar
npx shadcn@latest add card
```

---

# 5. 依存ライブラリ

導入候補として以下を使用。

```text
react-hook-form
zod
@hookform/resolvers
@tanstack/react-query
axios
date-fns
clsx
tailwind-merge
lucide-react
```

開発用:

```text
prettier
prettier-plugin-tailwindcss
```

用途:

- react-hook-form: フォーム管理
- zod: バリデーション
- @hookform/resolvers: ZodとReact Hook Formの連携
- @tanstack/react-query: API通信・キャッシュ
- axios: HTTP通信
- date-fns: 日付処理
- lucide-react: アイコン
- clsx/tailwind-merge: className整理

---

# 6. npm audit / High severity vulnerabilities

インストール時にhigh severity vulnerabilitiesが表示された。

対応方針:

1. まず詳細確認

```bash
npm audit
```

2. 修正候補を確認

```bash
npm audit fix --dry-run
```

3. 破壊的変更を避けて修正

```bash
npm audit fix
```

4. 重複依存を整理

```bash
npm dedupe
```

5. 再確認

```bash
npm audit
npm run lint
npm run build
```

6. 依存経路を確認する場合

```bash
npm explain <package-name>
npm ls <package-name>
```

7. `npm audit fix --force`は現段階では使用しない。
   メジャーバージョン更新等の破壊的変更を含む可能性があるため、原因を特定してから判断する。

なお、package.jsonではNext.js 16.2.12、React 19.2.4等が使用されている。警告の正確な原因は`npm audit`の実出力で特定する。

---

# 7. tsconfig Import Alias

ルート直下に`app`がある構成では、以下のようにする。

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

これにより、

```tsx
import { Button } from "@/components/ui/button";
import { OrderForm } from "@/features/orders/components/order-form";
```

のように記述できる。

---

# 8. 現在までに実施したSTEP

## STEP1：開発環境の準備

- Node.js
- npm
- Git
- VS Code等

## STEP2：Next.jsプロジェクト作成

- Next.js
- TypeScript
- App Router
- Tailwind CSS
- ESLint
- Import Alias

## STEP3：shadcn/ui導入

```bash
npx shadcn@latest init
```

## STEP4：フロントエンドライブラリ導入

- React Hook Form
- Zod
- TanStack Query
- Axios
- date-fns
- Prettier等

## STEP5：ディレクトリ構成

ルート直下の`app`を利用。

## STEP6：Import Alias確認

`@/*` → `./*`

## STEP7：Git初期設定

```bash
git status
git add .
git commit -m "Initialize Next.js project with shadcn/ui"
```

## STEP8：開発サーバー・ビルド確認

```bash
npm run dev
npm run lint
npm run build
```

## STEP9：GitHubリポジトリ準備

GitHubへPushする。

## STEP10：共通レイアウト作成

作成した構成:

```text
components/
├── layouts/
│   ├── app-header.tsx
│   ├── app-shell.tsx
│   └── app-sidebar.tsx
└── ui/
```

実装内容:

- ヘッダー
- サイドバー
- AppShell
- SidebarProvider
- ダッシュボード
- 注文一覧の仮ページ
- 注文登録の仮ページ
- レスポンシブ対応

URL:

- `/`
- `/orders`
- `/orders/new`

STEP10完了後の主要構成:

```text
app/
├── globals.css
├── layout.tsx
├── page.tsx
└── orders/
    ├── page.tsx
    └── new/
        └── page.tsx
```

---

# 9. STEP10の重要実装

## AppShell

```tsx
<SidebarProvider>
  <AppSidebar />
  <SidebarInset>
    <AppHeader />
    <main>{children}</main>
  </SidebarInset>
</SidebarProvider>
```

## AppSidebar

- `usePathname()`で現在URLを取得
- 現在ページのメニューをactive表示
- `/`
- `/orders`
- `/orders/new`

`usePathname()`を使用するためClient Componentとする。

```tsx
"use client";
```

## AppHeader

- SidebarTrigger
- 通知ボタン
- 管理者ボタン

## Dashboard

仮データとして:

- 本日の注文
- 処理待ち
- 処理完了
- エラー

をカード表示。

---

# 10. 今後のPhase / STEP一覧

## Phase 1：Next.js／Reactフロントエンド基盤

- [STEP1 開発環境の準備](./phase1-frontend-foundation.md)
- [STEP2 Next.jsプロジェクト作成](./phase1-frontend-foundation.md)
- [STEP3 shadcn/ui導入](./phase1-frontend-foundation.md)
- [STEP4 フロントエンドライブラリ導入](./phase1-frontend-foundation.md)
- [STEP5 ディレクトリ構成](./phase1-frontend-foundation.md)
- [STEP6 Import Alias](./phase1-frontend-foundation.md)
- [STEP7 Git初期設定](./phase1-frontend-foundation.md)
- [STEP8 動作確認](./phase1-frontend-foundation.md)
- [STEP9 GitHub準備](./phase1-frontend-foundation.md)
- [STEP10 共通レイアウト](./phase1-frontend-foundation.md)
- [STEP11 注文一覧画面](./phase1-frontend-foundation.md)
- [STEP12 注文登録画面](./phase1-frontend-foundation.md)
- [STEP13 注文詳細画面](./phase1-frontend-foundation.md)
- [STEP14 注文編集画面](./phase1-frontend-foundation.md)
- [STEP15 フロントエンドAPI通信設計](./phase1-frontend-foundation.md)

## Phase 2：AWSサーバーレスバックエンド

- [STEP16 AWS開発環境準備](./phase2-backend-aws.md)
- [STEP17 Lambda基礎](./phase2-backend-aws.md)
- [STEP18 注文登録API](./phase2-backend-aws.md)
- [STEP19 注文取得API](./phase2-backend-aws.md)
- [STEP20 注文更新・削除API](./phase2-backend-aws.md)
- [STEP21 API Gateway連携](./phase2-step21-22-implementation-guide.md)
- [STEP22 DynamoDB導入](./phase2-step21-22-implementation-guide.md)
- [STEP23 バックエンド設計整理](./phase2-backend-aws.md)
- [STEP24 Next.jsとAWS APIの接続](./phase2-backend-aws.md)

## Phase 3：AWS CDKによるIaC

- [STEP25 CDKプロジェクト作成](./phase3-step25-cdk-project-setup.md)
- [STEP26 DynamoDBをCDKで作成](./phase3-cdk-iac.md)
- [STEP27 LambdaをCDKで作成](./phase3-cdk-iac.md)
- [STEP28 API GatewayをCDKで作成](./phase3-cdk-iac.md)
- [STEP29 環境分離](./phase3-cdk-iac.md)
- [STEP30 CDKデプロイ](./phase3-cdk-iac.md)

## Phase 4：イベント駆動・非同期処理

- [STEP31 イベント駆動設計](./phase4-event-driven.md)
- [STEP32 EventBridge導入](./phase4-event-driven.md)
- [STEP33 通知処理](./phase4-step33-notification-processing.md)
- [STEP34 SQS導入](./phase4-step34-sqs-introduction.md)
- [STEP35 DLQ設計](./phase4-step35-dlq-design.md)
- [STEP36 Step Functions導入](./phase4-step36-step-functions-introduction.md)
- [STEP37 注文処理ワークフロー](./phase4-step37-order-processing-workflow.md)
- [STEP38 非同期処理の監視](./phase4-step38-async-monitoring.md)

## Phase 5：React PDFによる帳票出力

- [STEP39 React PDF導入](./phase5-step39-react-pdf.md)
- [STEP40 請求書テンプレート](./phase5-step40-invoice-template.md)
- [STEP41 日本語フォント対応](./phase5-step41-japanese-fonts.md)
- [STEP42 PDF生成API](./phase5-step42-pdf-api.md)
- [STEP43 S3保存](./phase5-step43-s3-save.md)
- [STEP44 署名付きURL](./phase5-step44-signed-url.md)
- [STEP45 Step Functionsとの統合](./phase5-step45-step-functions-integration.md)

- 帳票プレビューは注文一覧から対象注文を選び、その注文データをそのまま請求書へ反映する。
- `STEP42` でサーバー生成 PDF を安定化した。
- `STEP43` では `GET /api/pdf/invoice/store` で S3 保存を確認できるようにした。
- `STEP44` では `GET /api/pdf/invoice/signed-url` で署名付き URL を発行できるようにした。
- 保存キーは `orders/<orderId>/invoice-<invoiceNumber>.pdf` に統一した。

## Phase 6：テスト設計

- [STEP46 テスト方針策定](./phase6-testing.md)
- [STEP47 Vitest導入](./phase6-testing.md)
- [STEP48 スキーマ・ユーティリティテスト](./phase6-testing.md)
- [STEP49 Reactコンポーネントテスト](./phase6-testing.md)
- [STEP50 TanStack Queryテスト](./phase6-testing.md)
- [STEP51 Lambda単体テスト](./phase6-testing.md)
- [STEP52 モック戦略](./phase6-testing.md)
- [STEP53 統合テスト](./phase6-testing.md)
- [STEP54 E2Eテスト](./phase6-testing.md)
- [STEP55 カバレッジ・品質基準](./phase6-testing.md)

STEP53で学んだもの:

- Service から Repository への呼び出し経路
- DynamoDB Repository の create / list / update / delete の一連の流れ
- AWS SDK はモックしても、Repository の変換ロジックは通せること

STEP54で学んだもの:

- Playwright で注文登録のブラウザ導線を確認できること
- PDF プレビューは API を route モックしても画面遷移と URL 生成を確認できること
- 画面テストでは hidden な option ではなく、実際の表示ラベルを locator で絞る必要があること

STEP55で学んだもの:

- Vitest の coverage gate を数値で固定できること
- E2E は Vitest と分離し、Playwright で別コマンドとして運用すること
- 実測カバレッジを基準にして、品質基準を過不足なく定義すること

STEP52で決めたこと:

- UI テストは Query hook をモックする
- Query テストは API 関数をモックする
- Lambda 単体テストは Service / Repository / AWS SDK をモックする
- `vi.mock` の hoist 問題は `vi.hoisted` で回避する
- テスト後の `mockReset` と環境変数の後始末を徹底する

## Phase 7：GitHub Actions CI/CD

- [STEP56 基本CI](./phase7-github-actions-cicd.md)
- [STEP57 依存関係キャッシュ](./phase7-github-actions-cicd.md)
- [STEP58 セキュリティチェック](./phase7-github-actions-cicd.md)
- [STEP59 Pull Request品質ゲート](./phase7-github-actions-cicd.md)
- [STEP60 AWS認証（GitHub OIDC）](./phase7-github-actions-cicd.md)
- [STEP61 CDK自動デプロイ](./phase7-github-actions-cicd.md)
- [STEP62 環境別デプロイ](./phase7-github-actions-cicd.md)
- [STEP63 フロントエンドデプロイ](./phase7-github-actions-cicd.md)
- [STEP64 ロールバック](./phase7-github-actions-cicd.md)
- [STEP65 通知](./phase7-github-actions-cicd.md)

## Phase 8：認証・セキュリティ・運用

- [STEP66 Cognito認証](./phase8-auth-security-ops.md)
- [STEP67 認可](./phase8-auth-security-ops.md)
- [STEP68 IAM最小権限](./phase8-auth-security-ops.md)
- [STEP69 機密情報管理](./phase8-auth-security-ops.md)
- [STEP70 APIセキュリティ](./phase8-auth-security-ops.md)
- [STEP71 ログ設計](./phase8-auth-security-ops.md)
- [STEP72 監視](./phase8-auth-security-ops.md)
- [STEP73 障害対応](./phase8-auth-security-ops.md)

## Phase 9：最終統合・模擬案件

- [STEP74 全機能統合](./phase9-final-integration.md)
- [STEP75 注文管理業務フロー完成](./phase9-final-integration.md)
- [STEP76 非機能要件確認](./phase9-final-integration.md)
- [STEP77 負荷・障害試験](./phase9-final-integration.md)
- [STEP78 ドキュメント作成](./phase9-final-integration.md)
- [STEP79 コードレビュー](./phase9-final-integration.md)
- [STEP80 成果物整理](./phase9-final-integration.md)

---

# 11. 学んだもの

STEP1で学んだもの:

- Node.js / npm / Git / エディタの最低限の開発環境を整えること
- 以後の実装確認を安定して進めるための前提を揃えること

STEP2で学んだもの:

- Next.js を App Router / TypeScript / Tailwind 前提で立ち上げること
- 初期状態から動作確認を行い、土台を早めに固めること

STEP3で学んだもの:

- shadcn/ui を初期化し、業務画面向けのコンポーネント基盤を作ること
- 必要な UI 部品だけを段階的に足していくこと

STEP4で学んだもの:

- React Hook Form、Zod、TanStack Query、Axios を役割分担して導入すること
- フォーム、バリデーション、API 通信の責務を分けること

STEP5で学んだもの:

- `features/` 中心で機能単位に整理すること
- 共通処理と注文機能を分けて保守性を上げること

STEP6で学んだもの:

- `@/*` の Import Alias で深い相対パスを避けること
- 機能追加時の import 管理を単純化すること

STEP7で学んだもの:

- Git の初期設定と初回コミットで作業の起点を作ること
- 履歴を残しながら段階的に進めること

STEP8で学んだもの:

- `dev`、`lint`、`build` を早い段階で通しておくこと
- 初期構成の安定性を先に確認すること

STEP9で学んだもの:

- GitHub へ push してリモート共有できる状態にすること
- 必要に応じて main 保護を考えること

STEP10で学んだもの:

- AppShell、ヘッダー、サイドバーで画面共通骨格を作ること
- React でレイアウトを組むときに Server / Client の境界を意識すること

STEP11で学んだもの:

- 一覧画面はテーブルとカードの両方で見やすさを担保すること
- 空状態や導線を先に用意しておくこと

STEP12で学んだもの:

- 登録画面はフォーム入力とエラー表示を一体で設計すること
- 必須項目やバリデーションは UI に明示すること

STEP13で学んだもの:

- 詳細画面は基本情報、商品明細、合計金額を分かりやすく分離すること
- 一件の注文を業務確認しやすい形で表示すること

STEP14で学んだもの:

- 既存値を初期値として再利用し、編集フォームに展開すること
- 登録と更新を同じ UI 資産から発展させること

STEP15で学んだもの:

- API Base URL を切り替え可能にしてフロントとバックエンドを疎結合にすること
- `/api` の同一オリジンと外部 API を使い分ける設計を持つこと

STEP16で学んだもの:

- AWS アカウント、SSO、CLI プロファイルを整えて接続前提を作ること
- `aws sts get-caller-identity` で認証状態を確認すること

STEP17で学んだもの:

- Lambdaの役割
- ハンドラーの基本
- イベント入力とレスポンス
- ローカル実行とデバッグの考え方
- Next.js フロントエンドとの責務分離

STEP18で学んだもの:

- 注文登録APIの入力検証
- 注文IDの生成
- 合計金額のサーバー側計算
- 201レスポンスと400レスポンスの返し分け

STEP19で学んだもの:

- 一覧取得と詳細取得の責務分離
- 検索条件をAPI側で受ける設計
- 404レスポンスの返し方

STEP20で学んだもの:

- 更新APIと削除APIの分離
- ステータス更新とフル更新の考え方
- 204ではなく JSON 応答にした場合の設計上の妥協点

STEP21で学んだもの:

- API Gateway の proxy integration の考え方
- CORS の基本
- ルートとメソッドで Lambda を振り分ける設計
- フロントエンドとの接続点をどこに置くか

STEP22で学んだもの:

- DynamoDB の役割
- アクセスパターン先行の設計
- Repository 層を挟む考え方
- DynamoDB 実装に永続化を集約する考え方
- 実AWSでの作業手順は `docs/phase2-step21-22-implementation-guide.md` に整理

STEP23で学んだもの:

- Next.js、API Gateway、Lambda、Service、Repository の責務分離
- API のルート、成功レスポンス、エラー契約の整理
- HTTP 層と永続化層を分離する理由
- DynamoDB 前提で永続化層を分離する境界

STEP24で学んだもの:

- Next.js から API Gateway への接続方法
- `/api` prefix と外部APIの切り替え
- 詳細画面を Server Component のローカルデータ依存から外す考え方
- 画面から削除するための mutation と再取得の連携

STEP25で学ぶもの:

- CDK アプリの入口と Stack の分離
- まず synth できる最小構成を作る考え方
- 後続の DynamoDB / Lambda / API Gateway 追加に備えた土台作り
- 実際の scaffold は `docs/cdk-project-setup.md` に整理

STEP26で学ぶもの:

- DynamoDB テーブルの基本設計
- 開発環境での `DESTROY` と `PAY_PER_REQUEST` の使い分け
- テーブル名とARNを Output に出す考え方
- 実装の詳細は `docs/dynamodb-cdk-setup.md` に整理

STEP27で学ぶもの:

- Lambda を CDK から作成する方法
- `NodejsFunction` を使った TypeScript バンドル
- DynamoDB への権限付与
- 実装の詳細は `docs/lambda-cdk-setup.md` に整理

STEP28で学ぶもの:

- HTTP API を CDK で公開する方法
- CORS とルート定義の考え方
- Lambda proxy integration の payload format を合わせる重要性
- 実装の詳細は `docs/api-gateway-cdk-setup.md` に整理

STEP29で学んだもの:

- `stage` に応じたリソース命名
- dev と prod での削除ポリシー分離
- CORS の許可オリジンを環境ごとに切り替える考え方
- CDK context で環境差分を受け渡す方法

STEP30で学んだもの:

- CDK デプロイの基本手順
- dev と prod のデプロイ順序
- synth / diff / deploy の使い分け
- SSO / IAM エラー時の確認ポイント

STEP31で学んだもの:

- 同期処理と非同期処理の境界を先に決めること
- 業務イベントをイベント名と発火点で整理すること

STEP32で学んだもの:

- EventBridge を業務イベントの配信基盤として使うこと
- ルールとターゲットで購読先を増やしやすくすること

STEP33で学んだもの:

- 通知処理を独立した Lambda として切り出すこと
- SNS と EventBridge を組み合わせて通知経路を作ること

STEP34で学んだもの:

- SQS で非同期処理をバッファすること
- Consumer Lambda を通して疎結合に処理を進めること

STEP35で学んだもの:

- DLQ で失敗メッセージを隔離すること
- redrive policy と maxReceiveCount を確認して運用を考えること

STEP36で学んだもの:

- Step Functions でワークフローの責務を分けること
- 成功分岐と失敗分岐を明示して可観測性を上げること

STEP37で学んだもの:

- EventBridge から Step Functions を自動起動すること
- 注文登録後の後続処理を業務フローとしてつなぐこと

STEP38で学んだもの:

- CloudWatch Alarm で DLQ やワークフロー失敗を監視すること
- 手動確認と自動監視を組み合わせて運用すること

STEP39で学んだもの:

- React PDF で帳票をコンポーネントとして組み立てること
- 画面プレビューと生成 PDF を同じ帳票定義から扱うこと

STEP40で学んだもの:

- 請求書テンプレートを業務帳票として設計すること
- 表示順序、項目配置、合計の見せ方を意識すること

STEP41で学んだもの:

- 日本語フォントの埋め込みが PDF 品質に直結すること
- フォント読み込みと表示崩れの切り分けをすること

STEP42で学んだもの:

- PDF 生成 API をサーバー側で持つこと
- ブラウザ描画とサーバー生成の責務を分けること

STEP43で学んだもの:

- 生成した PDF を S3 に保存すること
- 保存ボタンと実リソースの疎通を確認すること

STEP44で学んだもの:

- 署名付き URL で保存済み PDF を安全に共有すること
- 公開せずに一時アクセスを許可する設計を使うこと

STEP45で学んだもの:

- Step Functions と帳票出力を連携させること
- 注文処理の後段に請求書生成を組み込むこと

STEP46で学んだもの:

- テスト対象をスキーマ、UI、API、Lambda、統合、E2E に分けること
- 何をテストしないかを先に決めること

STEP47で学んだもの:

- Vitest を導入してフロントとバックエンドのテスト基盤を作ること
- jsdom と Node の実行環境を分けること

STEP48で学んだもの:

- スキーマとユーティリティは境界値と異常系で固めること
- 純粋関数は小さくても回帰の起点になること

STEP49で学んだもの:

- コンポーネントテストで表示とレイアウトの確認を行うこと
- 画面の主要分岐を実装に合わせて検証すること

STEP50で学んだもの:

- TanStack Query の fetch / invalidate を契約としてテストすること
- キャッシュ更新の流れを UI と API の間で確認すること

STEP51で学んだもの:

- Lambda ハンドラーの HTTP 契約を単体で確認すること
- create / get / update / delete / workflow を分けて検証すること

STEP52で学んだもの:

- `vi.mock` と `vi.hoisted` を使い分けること
- 層ごとにモックする対象を絞ること

STEP53で学んだもの:

- Service と Repository をつないだ統合テストを持つこと
- DynamoDB の実装差し替えを前提に疎結合を保つこと

STEP54で学んだもの:

- Playwright でブラウザ上の業務導線を確認すること
- 画面表示、異常系、レイアウトを E2E で見切ること

STEP55で学んだもの:

- カバレッジ基準を数値で固定し、品質ゲートにすること
- 100% を目的にせず、重要分岐を優先すること

STEP56で学んだもの:

- GitHub Actions で lint / test / build を回す基本 CI を作ること
- `pull_request` と `main` push で品質確認すること

STEP57で学んだもの:

- `npm` キャッシュと `.next/cache` を組み合わせて CI を速くすること
- Next.js の build キャッシュを継続利用すること

STEP58で学んだもの:

- `npm audit` と secret scan を CI に組み込むこと
- 依存関係と秘匿情報の両方を品質ゲートにすること

STEP59で学んだもの:

- PR テンプレートでレビュー前の確認を標準化すること
- branch protection で必須チェックと review を強制すること

STEP60で学んだもの:

- GitHub OIDC で長期アクセスキーなしの AWS 認証を実現すること
- 環境ごとに IAM role を分け、GitHub Environment と repository variables で参照先を切り替えること
- `aws sts get-caller-identity` で認証成功を手早く確認すること

STEP61で学んだもの:

- CDK CLI を devDependency に固定し、GitHub Actions でも同じバージョンを使うこと
- `main` push で dev を自動デプロイし、prod は手動デプロイに分けること
- デプロイ前に `aws sts get-caller-identity` で認証確認を挟むこと
- `cdk deploy` の前に `npm ci` で依存関係を揃えること
- 既存リソースと衝突しやすい S3 バケットは固定名を避け、CDK 管理に寄せること

STEP62で学んだもの:

- dev は自動、prod は手動という運用に分けること
- GitHub Environment の reviewer で prod 承認を挟むこと
- workflow_dispatch で明示的に stage を選ばせること
- 環境ごとのデプロイ先と OIDC subject を揃えること
- 2026-08-28 に `workflow_dispatch` の `stage=prod` 実行が成功し、本番デプロイの運用確認まで完了したこと

STEP63で学んだもの:

- Next.js は `standalone` 出力にすると Node.js サーバーとして配信しやすいこと
- `NEXT_PUBLIC_API_BASE_URL` は build 時に注入して環境ごとに切り替えること
- frontend の配信は Docker image として publish すると扱いやすいこと
- GitHub Actions で GHCR に publish すると dev / prod の配布を整理しやすいこと

STEP64で学んだもの:

- frontend の rollback は immutable tag を基準にして `stage-latest` を戻すと分かりやすいこと
- infrastructure の rollback は `git revert` と再 deploy に分けると整理しやすいこと
- どの tag / commit に戻したかを記録すると、復旧手順が追いやすいこと

---

# 12. 学習上の方針

このハンズオンは「単に動くコードを書く」ことではなく、実務で説明できる設計能力を身につけることを目的とする。

各STEPで以下を意識する。

- なぜその技術を選ぶのか
- Server Component / Client Componentをどう分けるか
- Feature単位でどう責務を分離するか
- API境界をどう設計するか
- 型をどこで定義するか
- エラーをどこで処理するか
- 何をテストし、何をMockするか
- AWSサービス間の責務をどう分けるか
- IaCとしてどう再現可能にするか
- CI/CDで何を自動化するか
- 障害発生時にどう追跡・復旧するか

各STEP完了時にはGitコミットを行い、実務に近い開発履歴を残す。

---

# 13. 次回の開始指示

各Phaseの詳細手順は `docs/phase-index.md` から参照できる。
各Phaseの詳細設計は `docs/design-index.md` から参照できる。

次回は以下だけ伝えれば続きから開始できる。

「STEP31から続けてください」

その場合、現在の前提を維持して、イベント駆動設計から開始する。
