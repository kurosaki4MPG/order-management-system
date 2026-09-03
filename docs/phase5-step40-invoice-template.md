# STEP40 請求書テンプレート

この手順は、React PDF の土台の上に業務向けの請求書テンプレートを載せるための記録である。

## 実施内容

- ヘッダーを請求書らしい見た目に整えた
- 請求先情報と発行者情報を分けて表示するようにした
- 注文 ID、請求書番号、発行日時を上部にまとめた
- 注文 ID と請求書番号の末尾 8 桁を揃え、対応関係を追いやすくした
- 明細テーブルを読みやすい幅と行構成に調整した
- 備考と合計を分けて表示し、業務帳票としての骨格を作った

## 実装ファイル

- [`src/features/pdf/invoice-document.tsx`](../src/features/pdf/invoice-document.tsx)
- [`src/features/pdf/pdf-preview-panel.tsx`](../src/features/pdf/pdf-preview-panel.tsx)
- [`src/app/pdf-preview/page.tsx`](../src/app/pdf-preview/page.tsx)

## 確認方法

1. アプリを起動する
2. サイドバーの `帳票プレビュー` を開く
3. `請求書を生成` を押す
4. 請求先、発行者、明細、備考、合計が見やすく表示されることを確認する

## 確認観点

- 請求書として読める構成になっている
- 明細と合計の関係が分かりやすい
- STEP42 以降で入力データを差し込める構造になっている

## 完了条件

- 請求書テンプレートの雛形ができている
- 以降のフォント対応と PDF 生成 API に進める
