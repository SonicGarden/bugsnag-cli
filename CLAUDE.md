# @sonicgarden/bugsnag-cli

Bugsnag Data Access API からエラー情報を取得する CLI ツール。

使い方・コマンドリファレンス・インストール方法は [README.md](README.md) を参照。

## 設計

### 概要
- 人間と AI (Claude Code skill) が使用することを想定
- 出力は常に JSON（`projects get-id` のみプレーンテキスト）
- npm public パッケージとして最終的に公開（開発中は GitHub リポジトリからインストール）

### 技術スタック
- TypeScript
- pnpm (パッケージマネージャー)
- tsdown (ビルド)
- vitest (テスト)
- oxfmt (フォーマッター)
- oxlint (リンター)
- citty (CLI パーサー)
- Node.js 組み込み fetch (HTTP クライアント)

### フィルタの内部実装
CLI の `--filter key=value` は API のクエリパラメータ `filters[key][][type]=...&filters[key][][value]=...` に変換される。
フィルタタイプは自動決定: `search` は `co`（部分一致）、それ以外は `eq`（完全一致）。
`URLSearchParams` はブラケット `[]` をパーセントエンコードしてしまうため、クエリ文字列を手動で構築している。
citty は同名引数の繰り返しをサポートしないため、`--filter` は `process.argv` から直接収集している。

### 配布
- 最終的には npm public パッケージとして公開
- 開発中は GitHub リポジトリからインストール: `pnpm add github:SonicGarden/bugsnag-cli`
- `package.json` の `prepare` スクリプトで自動ビルド

### メタデータ検索について
Bugsnag のカスタムフィルタ（metadata での検索）は Preferred/Enterprise プランが必要。
API もダッシュボードと同じフィルタ機構を使うため、プランの制限は API でも同じと考えられる。
カスタムフィルタが使えないプランでは、個別 Event を取得して AI に分析させるアプローチが現実的。

## 開発コマンド

```bash
pnpm install     # 依存インストール
pnpm build       # ビルド (tsdown)
pnpm test        # テスト (vitest)
pnpm typecheck   # 型チェック (tsc)
pnpm lint        # リント (oxlint)
pnpm format      # フォーマット (oxfmt)
```
