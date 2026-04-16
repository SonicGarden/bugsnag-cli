---
name: bugsnag
description: Bugsnag のエラー調査スキル。sg-bugsnag を使って Bugsnag Data Access API からエラー・イベント情報を取得し、原因調査を行う。ユーザーが Bugsnag のエラーについて質問したとき、エラーの調査を依頼されたとき、本番環境の障害やエラーの原因を調べたいとき、Bugsnag の URL やエラークラス名に言及したときに使用する。
---

# Bugsnag エラー調査スキル

Bugsnag Data Access API を `sg-bugsnag` コマンド経由で呼び出し、エラー情報を取得・分析する。

## 前提条件

- `@sonicgarden/bugsnag-cli` がプロジェクトの devDependencies にインストール済みであること
- 環境変数 `BUGSNAG_TOKEN` が設定されていること
- 環境変数 `BUGSNAG_PROJECT_ID` が設定されていること（省略時は都度 `--project-id` で指定）

## CLI コマンドリファレンス

すべてのコマンドは JSON を stdout に出力する。出力形式は `{ "data": ..., "pagination": { "next": "..." } }` のエンベロープ構造。

### プロジェクト一覧

```bash
sg-bugsnag projects list [--query NAME]
```

Organization ID は省略可能（トークンから自動取得される）。`--query` でプロジェクト名の部分一致検索が可能。

### エラー一覧

```bash
sg-bugsnag errors list [--project-id ID] [--filter KEY=TYPE:VALUE ...] [--sort FIELD] [--direction asc|desc] [--per-page N]
```

- `--sort`: `last_seen`, `first_seen`, `events`, `users`
- `--direction`: `asc` または `desc`

### エラー詳細

```bash
sg-bugsnag errors show ERROR_ID [--project-id ID]
```

### イベント一覧

```bash
sg-bugsnag events list [--project-id ID] [--error-id ERROR_ID] [--filter KEY=TYPE:VALUE ...] [--per-page N]
```

### イベント詳細

```bash
sg-bugsnag events show EVENT_ID [--project-id ID]
```

## フィルタの書き方

`--filter` オプションで Bugsnag API のフィルタを指定できる。形式は `KEY=TYPE:VALUE`。

よく使うフィルタ:

| キー | 説明 | 例 |
|------|------|-----|
| `search` | エラークラス名・メッセージのテキスト検索 | `--filter search=co:timeout` |
| `event.class` | エラークラス名（完全一致） | `--filter event.class=eq:NoMethodError` |
| `event.since` | 指定日時以降 | `--filter event.since=eq:2024-01-01T00:00:00.000Z` |
| `event.before` | 指定日時以前 | `--filter event.before=eq:2024-02-01T00:00:00.000Z` |
| `event.severity` | 重要度 | `--filter event.severity=eq:error` |
| `app.release_stage` | リリースステージ | `--filter app.release_stage=eq:production` |
| `user.email` | ユーザーメール | `--filter user.email=eq:user@example.com` |
| `user.id` | ユーザー ID | `--filter user.id=eq:12345` |

フィルタタイプ:
- `eq` — 完全一致。ほとんどのフィルタキーで使用
- `ne` — 不一致
- `co` — 部分一致。`search` フィルタ専用。他のキー（`event.class` 等）では使えない

エラークラス名やメッセージをあいまい検索したい場合は `event.class=eq:...` ではなく `search=co:...` を使う。

複数フィルタは `--filter` を繰り返して指定する。

## 調査の進め方

### 1. エラーの特定

ユーザーが Bugsnag の URL を貼った場合は、その URL からプロジェクト ID やエラー ID を読み取る。
URL が無い場合は、エラー一覧から該当エラーを探す。

```bash
# 最近のエラーを重要度順に取得
sg-bugsnag errors list --sort last_seen --direction desc --per-page 5

# エラークラス名で絞り込み
sg-bugsnag errors list --filter event.class=eq:NoMethodError
```

### 2. エラー詳細の確認

エラー ID がわかったら詳細を取得する。

```bash
sg-bugsnag errors show ERROR_ID
```

### 3. イベント（発生事例）の取得

エラーの個別の発生事例を確認する。イベントにはスタックトレース、メタデータ、リクエスト情報などが含まれる。

```bash
# 特定エラーのイベント一覧
sg-bugsnag events list --error-id ERROR_ID --per-page 3

# イベント詳細（スタックトレース、メタデータ込み）
sg-bugsnag events show EVENT_ID
```

### 4. 原因の分析

イベント詳細から以下を確認して原因を推定する:

- `exceptions` — スタックトレースからエラー発生箇所を特定
- `metadata` — アプリケーション固有のカスタムデータ
- `request` — リクエスト URL、メソッド、パラメータ
- `user` — 影響を受けたユーザー情報
- `app` — アプリバージョン、リリースステージ
- `device` — OS、ブラウザなどの環境情報

スタックトレースのファイルパスをもとに、プロジェクト内の該当コードを読み、根本原因を調査する。

### 5. ページネーション

結果が多い場合、レスポンスの `pagination.next` に次ページの URL が含まれる。追加データが必要な場合のみ次ページを取得する。
