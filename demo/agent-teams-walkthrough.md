# Agent Teams Walkthrough: ship-from-issue 実例

このファイルは Part 6 のスライド 26d「Agent Teams デモ動画」の **代替テキスト + 静止画版**。
動画ファイルが再生できない場合 / セッション中に外部リソースに到達できない場合のフォールバックとして、講師が VS Code で開いて手順を見せる素材。

実 demo は `apps/InsightLog/demo/run.sh` で起動するが、本ファイルは「動画なしで全体感を理解させる」ことに特化したダイジェスト版。

---

## 全体像

`/ship-from-issue` は Claude Code の slash command で、GitHub Issue を起点に **計画 → 実装 → テスト → コミット → PR → レビュー** までを 7 フェーズで自律実行する。各フェーズは独立した Sub-Agent またはskill が担当。

```
[plan]      planner-team       Issue を読んで実装計画を策定
   ↓
[implement] implementer        計画書を読んで実装
   ↓
[unit-test] test-writer  ─┐ 並行実行
[e2e-plan]  e2e-planner  ─┘
   ↓
[e2e-run]   e2e-runner         Playwright でブラウザ操作・録画
   ↓
[commit]    committer           規約に従ってコミット
   ↓
[pr]        pr-creator          スクリーンショット付きで PR 作成
   ↓
[review]    reviewer-team       quality / ux / test の 3 観点 + Devil
```

実装ファイル:
- 起動: `apps/InsightLog/demo/run.sh`
- フェーズ DAG: `apps/InsightLog/demo/pipeline.json`
- ストリーム整形: `apps/InsightLog/demo/stream-parser.py`
- 各 Sub-Agent: `apps/InsightLog/.claude/agents/`
- planner-team / reviewer-team: `apps/InsightLog/.claude/skills/`

---

## ステップ 1: Issue 起票

受講者が GitHub に Issue を起票する。例: 「タスク記録フォームに必須バリデーション表示を追加」。

`[スクリーンショット 1: GitHub Issue 起票画面]`

実 demo では `apps/InsightLog/demo/fallback/issue.md` がフォールバック仕様書として使われる（`gh auth` 未認証時）。

**講師ノート**: Issue 形式の Markdown が「曖昧な要望 → 具体化された Issue」の到達例として、`apps/InsightLog/docs/specs/必須フィールドにバリデーション表示を追加.issue.md` が既にある。これと同じ構造の Issue を GitHub に登録する流れ。

---

## ステップ 2: `/ship-from-issue` 起動

Claude Code セッション内で実行:

```bash
/ship-from-issue 5
```

または `apps/InsightLog/demo/run.sh` を直接起動:

```bash
cd /path/to/InsightLog
./demo/run.sh
```

`[スクリーンショット 2: ship-from-issue 起動コマンド + 起動メッセージ]`

`run.sh` が `feature_list.json` を生成し、`pipeline.json` の DAG に従って supervisor agent が各フェーズを順次起動する。

**講師ノート**: なぜ slash command ではなくシェルスクリプトを併用するか? シェルは Claude Code を「外側から」起動する launcher で、worktree 分離 / stream-json ログ / tail 進捗などの「外側の設定」を担当。中身のワークフローは `/ship-from-issue` に任せる、という二層構造になっている。

---

## ステップ 3: planner-team が計画策定

`apps/InsightLog/.claude/skills/planner-team/SKILL.md` で定義された 4 ロール (PM / Searcher / Architect / Devil) が Plan 草案を策定。

```
[plan] planner-team — spawn  実装計画を策定
   ├─ [👑 PM]      要件分解 + ロール調整
   ├─ [🔍 Searcher] 公式ドキュメント・既存コード調査
   ├─ [🏗 Architect] 設計案立案 (3 案 + 比較)
   └─ [😈 Devil]    各案の弱点を critical / warning で批判
   → 最終 plan を docs/plan/ に保存
```

`[スクリーンショット 3: planner-team の出力例 (4 ロールの議事録)]`

**講師ノート**: Devil's Advocate サイクルが入ることで「3 票同意 = 安全」を破壊する。並列同系統 LLM の認知バイアス対策。実装は `apps/InsightLog/.claude/skills/planner-team/roles/devil.md` を参照。

---

## ステップ 4: implementer + test-writer が並列で実装

`implementer` が src/ を編集、`test-writer` が並行してテストを書く。

```
[implement] implementer — spawn  ROI機能を実装
   🔧 Edit  src/components/task/TaskForm.tsx
   🔧 Write src/lib/validators.ts
   ✓ Build succeeded

[unit-test] test-writer — spawn  ユニットテスト作成
   🔧 Write src/tests/unit/TaskForm.test.tsx
   ✓ Vitest: 5 / 5 passed
```

`[スクリーンショット 4: 並列実装の進捗ログ (tail -f claude-progress.txt)]`

実 Sub-Agent 定義:
- `apps/InsightLog/.claude/agents/implementer.md` (tools: Bash / Read / Write / Edit)
- `apps/InsightLog/.claude/agents/test-writer.md` (tools: Bash / Read / Write / Edit)

**講師ノート**: 各 Sub-Agent の `tools` は親 PM が制限している。implementer は npm run build を打てるが Slack には投稿できない、というように「子の能力範囲を親が決める」設計。

---

## ステップ 5: e2e-planner + e2e-runner が E2E テスト

Playwright MCP 経由で E2E テスト計画 → 実行。録画も自動。

```
[e2e-plan]  e2e-planner — spawn  E2E テスト設計
   📝 Write src/e2e/task-form-required-validation.spec.ts

[e2e-run]   e2e-runner — spawn  Playwright で実行
   🌐 Playwright MCP browser_navigate http://localhost:5173
   🌐 Playwright MCP browser_take_screenshot
   🎥 録画: demo/screenshots/test-results/task-form-required.webm
   ✓ 3 / 3 passed (8.2s)
```

`[スクリーンショット 5: Playwright テスト結果 (録画ファイル一覧)]`

実 Sub-Agent 定義:
- `apps/InsightLog/.claude/agents/e2e-planner.md` (tools: Read / Write)
- `apps/InsightLog/.claude/agents/e2e-runner.md` (tools: Bash / mcp__playwright__*)

**講師ノート**: e2e-runner は `npx playwright test` の **直接実行が禁止** されている (CLAUDE.md L73)。代わりに Playwright MCP サーバー経由で実行する設計。これは「壊れたテストランナーを使わせない」という防御策。

---

## ステップ 6: committer + pr-creator が PR 作成

```
[commit] committer — spawn  規約に従ってコミット
   🔧 git add src/components/task/TaskForm.tsx ...
   🔧 git commit -m "feat(task): ..."
   ✓ commit abc1234

[pr]     pr-creator — spawn  PR を作成
   🔧 git push -u origin feature/task-validation
   🔧 gh pr create --title "..." --body "..."
   ✓ PR #42 created: https://github.com/arkatom/InsightLog/pull/42
```

`[スクリーンショット 6: 作成された PR (タイトル + 説明 + diff)]`

実 Sub-Agent 定義:
- `apps/InsightLog/.claude/agents/committer.md` (tools: Bash / Read)
- `apps/InsightLog/.claude/agents/pr-creator.md` (tools: Bash / Read)

**講師ノート**: committer の tools には `Edit` / `Write` が **含まれていない**。これは「ファイル編集はもう終わった、コミットだけしろ」というスコープ制限。各 Sub-Agent の tools 制限が「責務分離」の実装になっている。

---

## ステップ 7: reviewer-team が多視点レビュー

`apps/InsightLog/.claude/skills/reviewer-team/SKILL.md` で定義された 5 ロール (PM / quality / ux / test / Devil) が並列でレビュー。

```
[review] reviewer-team — spawn  多角的レビュー
   ├─ [🔍 quality-reviewer] 型・ロジック・エッジケース
   ├─ [🎨 ux-reviewer]      デザイン・アクセシビリティ
   ├─ [📋 test-reviewer]    テスト網羅性・AC カバレッジ行列
   └─ [😈 Devil]            横断批判 + 「遠慮」の摘発
   → [👑 PM] 統合 → gh pr review --request-changes
```

`[スクリーンショット 7: レビューコメント例 (4 ロールの統合)]`

詳細な出力例は `apps/InsightLog/demo/review-output-example.md` を参照。

**講師ノート**: reviewer-team は SKILL（明示呼び出し）として実装されており、Sub-Agent ではない。SubAgent vs Skill の使い分けは「単発の汎用作業 = SubAgent」「複数ロール協働ワークフロー = Skill」と覚えると分かりやすい。

---

## 補足: 各 Sub-Agent の責務

| Agent / Skill | 責務 | tools 制限 | 実ファイル |
|----------------|------|------------|------------|
| committer (Sub-Agent) | コミット作成 | Bash / Read | `apps/InsightLog/.claude/agents/committer.md` |
| implementer (Sub-Agent) | コード編集 | Bash / Read / Write / Edit | `apps/InsightLog/.claude/agents/implementer.md` |
| test-writer (Sub-Agent) | ユニットテスト作成 | Bash / Read / Write / Edit | `apps/InsightLog/.claude/agents/test-writer.md` |
| e2e-planner (Sub-Agent) | E2E 計画 | Read / Write | `apps/InsightLog/.claude/agents/e2e-planner.md` |
| e2e-runner (Sub-Agent) | E2E 実行 | Bash / mcp__playwright__* | `apps/InsightLog/.claude/agents/e2e-runner.md` |
| pr-creator (Sub-Agent) | PR 作成 | Bash / Read | `apps/InsightLog/.claude/agents/pr-creator.md` |
| cc-feature-review (Sub-Agent) | Claude Code 機能調査 | Read / Glob / Grep / WebSearch / WebFetch | `apps/InsightLog/.claude/agents/cc-feature-review.md` |
| planner-team (Skill) | 計画策定 (4 ロール) | (Skill 内で各 Agent 起動) | `apps/InsightLog/.claude/skills/planner-team/SKILL.md` |
| reviewer-team (Skill) | レビュー (5 ロール) | (Skill 内で各 Agent 起動) | `apps/InsightLog/.claude/skills/reviewer-team/SKILL.md` |

---

## ログの再生（事後分析用）

実 demo の生 JSON ログから、エージェントの全活動を再生できる:

```bash
cat apps/InsightLog/demo/logs/raw_<timestamp>.jsonl | python3 apps/InsightLog/demo/stream-parser.py
```

これは「録画動画が再生できない場合」「録画自体がない場合」の代替素材として有効。ログから `🔧 Tool: ...` の行を抽出すれば、各 Agent が呼び出した tool の履歴が見える。

---

## 講師ノート（Part 6 slide 26d で活用する想定）

- このファイルを VS Code で開き、**ステップ 1-7 を順に読み上げながら** 該当する Sub-Agent / Skill 定義ファイルを並列で開く
- 7 枚のスクリーンショット placeholder は将来撮影して埋め込む（現状はテキストのみで成立する設計）
- 動画再生に失敗した場合の代替として 5 分でダイジェスト読み上げ可能
- 「7 体の Sub-Agent + 2 つの Skill」の構造を `ls apps/InsightLog/.claude/agents/ apps/InsightLog/.claude/skills/` で見せると、抽象的な「Agent Teams」が具体的な実装に繋がる

## 関連

- 実 demo: `apps/InsightLog/demo/run.sh` + `apps/InsightLog/demo/pipeline.json`
- レビュー出力例: `apps/InsightLog/demo/review-output-example.md`
- 各 Sub-Agent 定義: `apps/InsightLog/.claude/agents/*.md` (7 体)
- planner-team Skill: `apps/InsightLog/.claude/skills/planner-team/SKILL.md`
- reviewer-team Skill: `apps/InsightLog/.claude/skills/reviewer-team/SKILL.md`
- demo README: `apps/InsightLog/demo/README.md`
