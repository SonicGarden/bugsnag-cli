# @sonicgarden/bugsnag-cli

Bugsnag Data Access API からエラー情報を取得する CLI ツール。

## 設計

### 概要
- 人間と AI (Claude Code skill) が使用することを想定
- 出力は常に JSON
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

### 認証・設定
環境変数でデフォルト値を設定し、コマンド引数でオーバーライド可能。

| 環境変数 | 引数 | 説明 |
|----------|------|------|
| `BUGSNAG_TOKEN` | `--token` | Personal Auth Token (必須) |
| `BUGSNAG_ORG_ID` | `--org-id` | Organization ID (省略時は API から自動取得) |
| `BUGSNAG_PROJECT_ID` | `--project-id` | Project ID |

### コマンド構造
リソース + アクション形式。

```
bugsnag-cli projects list [--org-id]
bugsnag-cli errors list [--project-id] [--filter key=type:value ...]
bugsnag-cli errors show <error-id> [--project-id]
bugsnag-cli events list [--project-id] [--error-id] [--filter key=type:value ...]
bugsnag-cli events show <event-id> [--project-id]
```

### フィルタ指定
`--filter key=type:value` の簡略記法。複数指定可。

```bash
bugsnag-cli errors list --filter event.class=eq:MyError --filter event.since=eq:2024-01-01
```

API に渡されるフィルタ形式:
```json
{
  "event.class": [{ "type": "eq", "value": "MyError" }],
  "event.since": [{ "type": "eq", "value": "2024-01-01" }]
}
```

### 出力構造
正常時は stdout に JSON エンベロープ:
```json
{
  "data": [ ... ],
  "pagination": {
    "next": "https://api.bugsnag.com/..."
  }
}
```

エラー時は stderr にメッセージ + exit code 1。

### ページネーション
1ページ分だけ返却し、次ページの URL を `pagination.next` に含める。
`--per-page` で1ページあたりの件数を指定可能。

### 配布
- 最終的には npm public パッケージとして公開
- 開発中は GitHub リポジトリからインストール: `pnpm add github:SonicGarden/sg-bugsnag`
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
pnpm lint        # リント (oxlint)
pnpm format      # フォーマット (oxfmt)
```
