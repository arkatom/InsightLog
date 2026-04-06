---
description: "Ship-from-Issue パイプライン。GitHub Issue 番号を渡すと、計画 → 実装 → テスト → PR → レビューを自動実行する。"
---

# Ship-from-Issue パイプライン

**あなた自身が supervisor（パイプライン監督者）です。** Sub-agent に委任してはいけません。

## 制約

Agent ツールはネスト不可（サブエージェントは Agent を使えない）。
あなた（トップレベル）が直接すべての Agent / Skill を起動すること。

## 引数

`$ARGUMENTS` に GitHub Issue 番号、URL、またはローカル仕様ファイルのパスを受け取る。

- `42` or `#42` → GitHub Issue #42
- `https://github.com/.../issues/42` → GitHub Issue #42
- `docs/spec.md` → ローカルファイルを仕様として使用
- 引数なし → `demo/fallback/issue.md` をフォールバック使用

## 手順

### 1. Issue の取得

引数を解析して Issue の内容を取得する:

```bash
# GitHub Issue の場合
gh issue view <番号> --json title,body,labels

# ローカルファイルの場合
cat <ファイルパス>
```

Issue のタイトルと受け入れ条件を把握する。

### 2. ブランチ作成・開始記録

```bash
# ブランチ名: feat/issue-<番号> or feat/<タイトルのslug>
git checkout -b <ブランチ名>
```

**`claude-progress.txt` をブランチ作成直後に必ず作成する**（空ファイルでもよいので即時作成）。
これは `demo/run.sh` の `tail -f` バックグラウンドジョブが `until [[ -f ... ]]` でファイル出現を待っているため、作成が遅れると進捗ストリーミングが起動しないことを防ぐためである。

```bash
echo "[$(date '+%H:%M:%S')] パイプライン開始: <ブランチ名>" > claude-progress.txt
```

### 3. フェーズ実行

以下のフェーズを依存関係順に実行する。各 Agent / Skill 起動時には、デモ固有のパスをプロンプトで明示的に渡すこと（Agent 自体はデモ固有パスを知らない汎用ワーカーであるため）。

| フェーズ | 実行方法 | プロンプトで渡すパラメータ |
|---|---|---|
| **plan** | `Skill("planner-team")` | 計画書の保存先 = `demo/plan_output.md` |
| **implement** | Agent: `implementer` | 計画ファイルパス = `demo/plan_output.md`、計画の全内容、Issue 概要 |
| **unit-test** | Agent: `test-writer` | テスト対象ファイル一覧（implementer の出力）。e2e-plan と**並行起動** |
| **e2e-plan** | Agent: `e2e-planner` | `screenshots_dir = demo/screenshots`、`test_plan_path = src/e2e/test-plan.md`、`app_url = http://localhost:5173`。unit-test と**並行起動** |
| **e2e-run** | Agent: `e2e-runner` | `test_plan_path = src/e2e/test-plan.md`、`screenshots_dir = demo/screenshots`、`app_url = http://localhost:5173` |
| **commit** | Agent: `committer` | 変更ファイル一覧（参考） |
| **pr** | Agent: `pr-creator` | `screenshots_dir = demo/screenshots`、`videos_dir = demo/screenshots/test-results` |
| **review** | `Skill("reviewer-team")` | PR 番号、Issue の受け入れ条件 |

各 Agent / Skill は完了時に `demo/feature_list.json` の自フェーズの status を `done` に更新する（ファイルが存在する場合のみの optional 動作。デモ実行時は `run.sh` が生成するので存在する）。

### 4. フェーズ完了時

各フェーズ完了後に `claude-progress.txt` に記録を追記する。

### 5. パイプライン完了

全フェーズ完了で PR URL を出力する。
GitHub Issue 番号がある場合、PR 本文に `Closes #<番号>` を含める。

## Playwright MCP サーバーの使用（必須）

**Playwright ライブラリ（`npx playwright test`）は使用禁止。** ブラウザ操作・スクリーンショット撮影はすべて Playwright MCP サーバー経由で行うこと。

### ルール

1. `npx playwright test` や `@playwright/test` を直接使わない
2. ブラウザ操作は `mcp__playwright__browser_*` ツールのみ使用する
3. `browser_take_screenshot` 呼び出し時は **必ず `filename` パラメータを指定する**
   - 形式: `demo/screenshots/[連番]_[説明].png`（例: `demo/screenshots/01_home.png`）
   - `filename` 未指定のスクリーンショットは `.claude/settings.json` の PostToolUse hook で VS Code プレビューに表示できない
4. e2e-planner は `.spec.ts` ではなく **MCP 実行用テスト計画**（`src/e2e/test-plan.md`）を作成する
5. e2e-runner はテスト計画を読み、MCP ツールで各ステップを手動実行する

### スクリーンショットの自動プレビュー

`browser_take_screenshot` 実行後、PostToolUse hook が発火し VS Code のエディタタブにスクリーンショットが自動表示される。受講者はタブを見るだけで Claude が確認している画面を把握できる。

## Agent 起動の共通ルール

- プロンプトに Issue 概要・ブランチ名を含める
- 前フェーズの Agent 出力は次の Agent プロンプトに全文含める（省略禁止）
- 並行起動可能なフェーズは同時に起動する
