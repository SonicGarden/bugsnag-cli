# @sonicgarden/bugsnag-cli

Bugsnag Data Access API からエラー情報を取得する CLI ツール。人間と AI (Claude Code skill) の両方が使うことを想定しています。

## インストール

```bash
# 開発中は GitHub リポジトリからインストール
pnpm add -D github:SonicGarden/sg-bugsnag
```

## セットアップ

環境変数を設定してください。

```bash
export BUGSNAG_TOKEN=your_personal_auth_token
export BUGSNAG_PROJECT_ID=$(sg-bugsnag projects get-id your_project_name)
```

- `BUGSNAG_TOKEN` — Bugsnag の Settings > Personal auth tokens で作成
- `BUGSNAG_PROJECT_ID` — `sg-bugsnag projects get-id <name>` でプロジェクト名から取得

## 使い方

### プロジェクト一覧

```bash
sg-bugsnag projects list
sg-bugsnag projects list --query myapp       # プロジェクト名で検索
sg-bugsnag projects get-id myapp             # プロジェクトIDを取得（プレーンテキスト出力）
```

Organization ID はトークンから自動取得されます。

### エラー一覧

```bash
sg-bugsnag errors list
sg-bugsnag errors list --sort last_seen --direction desc --per-page 10
sg-bugsnag errors list --filter event.class=eq:TypeError
sg-bugsnag errors list --filter search=co:timeout
sg-bugsnag errors list --filter event.class=eq:TypeError --filter event.since=eq:2024-01-01T00:00:00.000Z
```

### エラー詳細

```bash
sg-bugsnag errors show ERROR_ID
```

### イベント一覧

```bash
sg-bugsnag events list --error-id ERROR_ID
sg-bugsnag events list --error-id ERROR_ID --per-page 5
sg-bugsnag events list --filter event.severity=eq:error
```

### イベント詳細

```bash
sg-bugsnag events show EVENT_ID
```

### フィルタ

`--filter KEY=TYPE:VALUE` 形式で指定します。複数指定可。

| キー | 説明 | 例 |
|------|------|-----|
| `search` | テキスト検索（部分一致） | `search=co:timeout` |
| `event.class` | エラークラス名（完全一致） | `event.class=eq:NoMethodError` |
| `event.since` | 指定日時以降 | `event.since=eq:2024-01-01T00:00:00.000Z` |
| `event.before` | 指定日時以前 | `event.before=eq:2024-02-01T00:00:00.000Z` |
| `event.severity` | 重要度 | `event.severity=eq:error` |
| `app.release_stage` | リリースステージ | `app.release_stage=eq:production` |
| `user.email` | ユーザーメール | `user.email=eq:user@example.com` |
| `user.id` | ユーザー ID | `user.id=eq:12345` |

フィルタタイプ:
- `eq` — 完全一致
- `ne` — 不一致
- `co` — 部分一致（`search` 専用）

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

## Claude Code skill

AI にエラー調査をさせるための Claude Code skill を同梱しています。

```bash
# プロジェクトにスキルをインストール
sg-bugsnag install-skill
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
