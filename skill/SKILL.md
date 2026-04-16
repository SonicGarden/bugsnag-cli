---
name: bugsnag
description: Bugsnag のエラー調査スキル。sg-bugsnag を使って Bugsnag Data Access API からエラー・イベント情報を取得し、原因調査を行う。ユーザーが Bugsnag のエラーについて質問したとき、エラーの調査を依頼されたとき、本番環境の障害やエラーの原因を調べたいとき、Bugsnag の URL やエラークラス名に言及したときに使用する。
---

# Bugsnag エラー調査スキル

Bugsnag Data Access API を `pnpm exec sg-bugsnag` コマンド経由で呼び出し、エラー情報を取得・分析する。

## 前提条件

- `@sonicgarden/bugsnag-cli` がプロジェクトの devDependencies にインストール済みであること
- 環境変数 `BUGSNAG_TOKEN` が設定されていること
- 環境変数 `BUGSNAG_PROJECT_ID` が設定されていること（省略時は都度 `--project-id` で指定）

## CLI コマンドリファレンス

すべてのコマンドは JSON を stdout に出力する。出力形式は `{ "data": ..., "pagination": { "next": "..." } }` のエンベロープ構造。
`-o FILE` オプションでファイルに保存できる。データ量が多い場合はファイル出力を推奨。

### プロジェクト一覧

```bash
pnpm exec sg-bugsnag projects list [--query NAME]
```

Organization ID は省略可能（トークンから自動取得される）。`--query` でプロジェクト名の部分一致検索が可能。

### プロジェクト ID 取得

```bash
pnpm exec sg-bugsnag projects get-id PROJECT_NAME
```

プロジェクト名の完全一致でプロジェクト ID をプレーンテキストで出力する。JSON ではなく ID 文字列のみ。

### エラー一覧

```bash
pnpm exec sg-bugsnag errors list [--project-id ID] [--filter KEY=VALUE ...] [--sort FIELD] [--direction asc|desc] [--per-page N]
```

- `--sort`: `last_seen`, `first_seen`, `events`, `users`
- `--direction`: `asc` または `desc`

### エラー詳細

```bash
pnpm exec sg-bugsnag errors show ERROR_ID [--project-id ID]
```

### イベント一覧

```bash
pnpm exec sg-bugsnag events list [--project-id ID] [--error-id ERROR_ID] [--filter KEY=VALUE ...] [--per-page N]
```

### イベント詳細

```bash
pnpm exec sg-bugsnag events show EVENT_ID [--project-id ID]
```

### イベント一括取得

特定エラーの全イベント詳細（スタックトレース、metaData 等）を一括取得する。ページネーションとレート制限は自動処理される。

```bash
pnpm exec sg-bugsnag events fetch ERROR_ID [--project-id ID] [--limit N] [--filter KEY=VALUE ...]
```

- `--limit` — 取得するイベントの最大数（省略時は全件）
- 出力形式は `{ "data": [...], "total": N }`

## フィルタの書き方

`--filter` オプションで Bugsnag API のフィルタを指定できる。形式は `KEY=VALUE`。`search` は部分一致、それ以外は完全一致。

よく使うフィルタ:

| キー | 説明 | 例 |
|------|------|-----|
| `search` | エラークラス名・メッセージのテキスト検索（部分一致） | `--filter search=timeout` |
| `event.class` | エラークラス名 | `--filter event.class=NoMethodError` |
| `event.since` | 指定日時以降 | `--filter event.since=2024-01-01T00:00:00.000Z` |
| `event.before` | 指定日時以前 | `--filter event.before=2024-02-01T00:00:00.000Z` |
| `event.severity` | 重要度 | `--filter event.severity=error` |
| `app.release_stage` | リリースステージ | `--filter app.release_stage=production` |
| `user.email` | ユーザーメール | `--filter user.email=user@example.com` |
| `user.id` | ユーザー ID | `--filter user.id=12345` |

複数フィルタは `--filter` を繰り返して指定する。

## 調査の進め方

### 1. エラーの特定

ユーザーが Bugsnag の URL を貼った場合は、その URL からプロジェクト ID やエラー ID を読み取る。
URL が無い場合は、エラー一覧から該当エラーを探す。

```bash
# 最近のエラーを重要度順に取得
pnpm exec sg-bugsnag errors list --sort last_seen --direction desc --per-page 5

# エラークラス名で絞り込み
pnpm exec sg-bugsnag errors list --filter event.class=NoMethodError
```

### 2. エラー詳細の確認

エラー ID がわかったら詳細を取得する。

```bash
pnpm exec sg-bugsnag errors show ERROR_ID
```

### 3. イベント（発生事例）の取得

エラーの個別の発生事例を確認する。イベントにはスタックトレース、メタデータ、リクエスト情報などが含まれる。

```bash
# 特定エラーのイベント一覧
pnpm exec sg-bugsnag events list --error-id ERROR_ID --per-page 3

# イベント詳細（スタックトレース、メタデータ込み）
pnpm exec sg-bugsnag events show EVENT_ID
```

### 4. 原因の分析

イベント詳細から以下を確認して原因を推定する:

- `exceptions` — スタックトレースからエラー発生箇所を特定
- `metaData` — アプリケーション固有のカスタムデータ
- `request` — リクエスト URL、メソッド、パラメータ
- `user` — 影響を受けたユーザー情報
- `app` — アプリバージョン、リリースステージ
- `device` — OS、ブラウザなどの環境情報
- `breadcrumbs` — エラー発生前のユーザー操作やイベントの履歴
- `context` — エラー発生時の画面やルート情報
- `severity` — エラーの重要度（error, warning, info）
- `unhandled` — ハンドルされなかった例外かどうか

スタックトレースのファイルパスをもとに、プロジェクト内の該当コードを読み、根本原因を調査する。

### 5. ページネーション

結果が多い場合、レスポンスの `pagination.next` に次ページの URL が含まれる。追加データが必要な場合のみ `--next` で次ページを取得する。

```bash
# 次ページの取得
pnpm exec sg-bugsnag events list --next "https://api.bugsnag.com/..."
pnpm exec sg-bugsnag errors list --next "https://api.bugsnag.com/..."
```

`--next` 指定時は他のオプション（`--project-id`, `--filter` 等）は不要。URL にすべて含まれている。
