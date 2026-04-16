# @sonicgarden/bugsnag-cli

Bugsnag Data Access API からエラー情報を取得する CLI ツール。人間と AI (Claude Code skill) の両方が使うことを想定しています。

## インストール

```bash
# 開発中は GitHub リポジトリからインストール
pnpm add -D github:SonicGarden/bugsnag-cli
```

## セットアップ

環境変数を設定してください。

```bash
export BUGSNAG_TOKEN=your_personal_auth_token
export BUGSNAG_PROJECT_ID=$(pnpm exec sg-bugsnag projects get-id your_project_name)
```

- `BUGSNAG_TOKEN` — Bugsnag の Settings > Personal auth tokens で作成
- `BUGSNAG_PROJECT_ID` — `pnpm exec sg-bugsnag projects get-id <name>` でプロジェクト名から取得

## 使い方

### プロジェクト一覧

```bash
pnpm exec sg-bugsnag projects list
pnpm exec sg-bugsnag projects list --query myapp       # プロジェクト名で検索
pnpm exec sg-bugsnag projects get-id myapp             # プロジェクトIDを取得（プレーンテキスト出力）
```

Organization ID はトークンから自動取得されます。

### エラー一覧

```bash
pnpm exec sg-bugsnag errors list
pnpm exec sg-bugsnag errors list --sort last_seen --direction desc --per-page 10
pnpm exec sg-bugsnag errors list --filter event.class=TypeError
pnpm exec sg-bugsnag errors list --filter search=timeout
pnpm exec sg-bugsnag errors list --filter event.class=TypeError --filter event.since=2024-01-01T00:00:00.000Z
```

### エラー詳細

```bash
pnpm exec sg-bugsnag errors show ERROR_ID
```

### イベント一覧

```bash
pnpm exec sg-bugsnag events list --error-id ERROR_ID
pnpm exec sg-bugsnag events list --error-id ERROR_ID --per-page 5
pnpm exec sg-bugsnag events list --filter event.severity=error
```

### イベント詳細

```bash
pnpm exec sg-bugsnag events show EVENT_ID
```

### イベント一括取得

特定エラーの全イベント詳細（スタックトレース、metaData 等）を一括取得します。
ページネーションとレート制限を自動的に処理します。

```bash
pnpm exec sg-bugsnag events fetch ERROR_ID
pnpm exec sg-bugsnag events fetch ERROR_ID --limit 10                              # 最大10件
pnpm exec sg-bugsnag events fetch ERROR_ID --filter event.since=2026-04-01T00:00:00.000Z  # フィルタ付き
```

### フィルタ

`--filter KEY=VALUE` 形式で指定します。複数指定可。`search` は部分一致、それ以外は完全一致。

| キー | 説明 | 例 |
|------|------|-----|
| `search` | テキスト検索（部分一致） | `search=timeout` |
| `event.class` | エラークラス名 | `event.class=NoMethodError` |
| `event.since` | 指定日時以降 | `event.since=2024-01-01T00:00:00.000Z` |
| `event.before` | 指定日時以前 | `event.before=2024-02-01T00:00:00.000Z` |
| `event.severity` | 重要度 | `event.severity=error` |
| `app.release_stage` | リリースステージ | `app.release_stage=production` |
| `user.email` | ユーザーメール | `user.email=user@example.com` |
| `user.id` | ユーザー ID | `user.id=12345` |

### 出力形式

すべてのコマンドは JSON を stdout に出力します。

```json
{
  "data": [ ... ],
  "pagination": {
    "next": "https://api.bugsnag.com/..."
  }
}
```

結果は1ページ分のみ返却され、次ページがある場合は `pagination.next` に URL が含まれます。
次ページを取得するには `--next` に URL を渡します:

```bash
pnpm exec sg-bugsnag events list --next "https://api.bugsnag.com/..."
```

### ファイル出力

JSON を出力するすべてのコマンドで `-o` オプションを使ってファイルに保存できます。

```bash
pnpm exec sg-bugsnag errors list -o errors.json
pnpm exec sg-bugsnag events fetch ERROR_ID -o events.json
```

## Claude Code skill

AI にエラー調査をさせるための Claude Code skill を同梱しています。

```bash
# プロジェクトにスキルをインストール
pnpm exec sg-bugsnag install-skill
```

`.claude/skills/bugsnag/SKILL.md` がインストールされ、Claude Code がエラー調査に使えるようになります。

## 開発

```bash
pnpm install     # 依存インストール
pnpm build       # ビルド
pnpm test        # テスト
pnpm lint        # リント
pnpm format      # フォーマット
```

## ライセンス

MIT
