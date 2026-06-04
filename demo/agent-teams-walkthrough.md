# Agent Teams Walkthrough: ship-from-issue 実例

このファイルは Part 6 のスライド 26d「Agent Teams デモ動画」の **代替テキスト + 静止画版**。
動画ファイルが再生できない場合 / セッション中に外部リソースに到達できない場合のフォールバックとして、講師が VS Code で開いて手順を見せる素材。

実 demo は `apps/InsightLog/demo/run.sh` で起動するが、本ファイルは「動画なしで全体感を理解させる」ことに特化したダイジェスト版。

---

## 全体像

`/ship-from-issue` は Claude Code の slash command で、GitHub Issue を起点に **計画 → 実装 → ユニットテスト/E2E計画 (並列) → E2E実行 → コミット → PR → レビュー** までを **8 フェーズ** で自律実行する。各フェーズは独立した Sub-Agent または Skill が担当。

実 DAG (`apps/InsightLog/demo/pipeline.json`):

```
[plan]      planner-team        Issue を読んで実装計画を策定
   ↓
[implement] implementer         計画書を読んで実装
   ↓
   ├─→ [unit-test] test-writer  ユニットテスト作成
   └─→ [e2e-plan]  e2e-planner  E2E テスト計画 (Markdown) 作成
        ↓ (両方の完了待ち)
[e2e-run]   e2e-runner          Playwright MCP でブラウザ操作・スクリーンショット撮影
   ↓
[commit]    committer           規約に従ってコミット
   ↓
[pr]        pr-creator          スクリーンショット付きで PR 作成
   ↓
[review]    reviewer-team       PM + quality + ux + test + Devil の 5 ロール
```

`unit-test` と `e2e-plan` は両方とも `implement` 完了後に **並列分岐**。`e2e-run` は **両方の完了を待つ** (pipeline.json の `depends_on: ["unit-test", "e2e-plan"]`)。

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

## ステップ 3: planner-team が計画策定 (フェーズ 1: plan)

`apps/InsightLog/.claude/skills/planner-team/SKILL.md` で定義された **PM / Searcher / Architect / Devil** の 4 ロールが Plan 草案を策定。

```
[plan] planner-team — spawn  実装計画を策定
   ├─ [👑 PM]      要件分解 + ロール調整
   ├─ [🔍 Searcher] 公式ドキュメント・既存コード調査
   ├─ [🏗 Architect] 設計案立案
   └─ [😈 Devil]    Devil's Advocate ループで弱点を critical / warning で批判
   → 最終 plan を `plan_output.md` または呼び出し元から渡されたパスに保存
```

`[スクリーンショット 3: planner-team の出力例 (4 ロールの議事録)]`

**講師ノート**: Devil's Advocate サイクルが入ることで「3 票同意 = 安全」を破壊する。同系統 LLM の認知バイアス対策。実装は `apps/InsightLog/.claude/skills/planner-team/roles/devil.md` を参照。保存先は呼び出し元 (run.sh / supervisor) が指定するため、`docs/plan/` 固定ではない。

---

## ステップ 4: implementer が実装 (フェーズ 2: implement)

`implementer` (tools: `Read, Write, Edit, Bash, Glob, Grep`) が src/ を編集。

```
[implement] implementer — spawn  機能を実装
   🔧 Edit  src/components/task/TaskForm.tsx
   🔧 Write src/lib/validators.ts
   🔧 Bash  npm run build
   ✓ Build succeeded (tsc --noEmit / vite build)
```

`[スクリーンショット 4: implementer の進捗ログ (tail -f claude-progress.txt)]`

実 Sub-Agent 定義:
- `apps/InsightLog/.claude/agents/implementer.md` (tools: `Read, Write, Edit, Bash, Glob, Grep`)

**講師ノート**: implementer は **TypeScript 型エラー 0 件 + ビルド成功を必達条件**。ビルドエラーが出ると自己修正してビルドが通るまでループする (description フロントマターの記述)。

---

## ステップ 5: test-writer + e2e-planner が並列分岐 (フェーズ 3-4)

`implement` 完了後、**`unit-test` と `e2e-plan` が並列で分岐**する (pipeline.json の DAG)。

```
[unit-test] test-writer — spawn  ユニットテスト作成
   tools: Read, Write, Edit, Bash, Glob, Grep
   🔧 Write src/tests/unit/TaskForm.test.tsx
   ✓ Vitest: 5 / 5 passed

[e2e-plan]  e2e-planner — spawn  E2E テスト計画 (Markdown) を作成
   tools: Read, Write, Edit, Glob, Grep
   🚫 .spec.ts は作成しない (e2e-planner.md で明示禁止)
   📝 Write src/e2e/test-plan.md (test_plan_path で渡された場所)
```

`[スクリーンショット 5: 並列分岐 (test-writer の Vitest 結果 + e2e-planner の test-plan.md)]`

実 Sub-Agent 定義:
- `apps/InsightLog/.claude/agents/test-writer.md` (tools: `Read, Write, Edit, Bash, Glob, Grep`)
- `apps/InsightLog/.claude/agents/e2e-planner.md` (tools: `Read, Write, Edit, Glob, Grep`、`.spec.ts` 作成禁止)

**講師ノート**: e2e-planner は **`.spec.ts` ファイルを作成しない / `npx playwright test` を使わない / `@playwright/test` の API を直接使うコードを書かない** が明示禁止 (e2e-planner.md L27-29)。代わりに Markdown テスト計画 (`test_plan_path`) を出力し、e2e-runner が MCP で実行する設計。

---

## ステップ 6: e2e-runner が MCP で実行 (フェーズ 5: e2e-run)

`unit-test` と `e2e-plan` の **両方の完了を待ってから** 起動 (pipeline.json: `depends_on: ["unit-test", "e2e-plan"]`)。

```
[e2e-run]   e2e-runner — spawn  Playwright MCP でテスト計画を実行
   tools: Bash, Read, Write, mcp__playwright__*
   🌐 mcp__playwright__browser_navigate http://localhost:5173
   🌐 mcp__playwright__browser_snapshot
   🌐 mcp__playwright__browser_click ref=...
   🌐 mcp__playwright__browser_take_screenshot filename="demo/screenshots/01_form.png"
   📸 撮影 4 枚 → Read で画像検証 (全枚 ✅ pass)
```

`[スクリーンショット 6: Playwright MCP テスト結果 (撮影スクリーンショット一覧 + Read 検証)]`

実 Sub-Agent 定義:
- `apps/InsightLog/.claude/agents/e2e-runner.md` (tools: `Bash, Read, Write, mcp__playwright__*`)

**講師ノート**: e2e-runner も `npx playwright test` の **直接実行が禁止** (e2e-runner.md L26)。代わりに `mcp__playwright__browser_*` ツールでブラウザ操作 → スクリーンショット撮影 → Read で画像検証する設計。これは「壊れたテストランナーを使わせない」+「PR レビュワーが画像で実装を確認できる」の 2 つの目的を満たす。

---

## ステップ 7: committer が commit (フェーズ 6: commit)

```
[commit] committer — spawn  規約に従ってコミット
   tools: Bash, Read
   🔧 git add src/components/task/TaskForm.tsx ...
   🔧 git commit -m "feat(task): ..."
   ✓ commit abc1234
```

`[スクリーンショット 7: 作成されたコミット (git log --oneline)]`

実 Sub-Agent 定義:
- `apps/InsightLog/.claude/agents/committer.md` (tools: `Bash, Read`)

**講師ノート**: committer の tools には `Edit` / `Write` が **含まれていない**。これは「ファイル編集はもう終わった、コミットだけしろ」というスコープ制限。各 Sub-Agent の tools 制限が「責務分離」の実装になっている。

---

## ステップ 8: pr-creator が PR 作成 + reviewer-team がレビュー (フェーズ 7-8)

```
[pr]     pr-creator — spawn  日本語の PR を作成
   tools: Bash, Read, Write
   🔧 git push -u origin feature/task-validation
   🔧 gh pr create --title "..." --body "..."
   ✓ PR #42 created (日本語見出し: 概要 / 変更内容 / 実装確認)

[review] reviewer-team — spawn  多角的レビュー (5 ロール)
   ├─ [👑 PM]            PR 情報収集 + 統合 + GitHub 投稿
   ├─ [🔍 quality-reviewer] 型・ロジック・エッジケース
   ├─ [🎨 ux-reviewer]      デザイン・アクセシビリティ
   ├─ [📋 test-reviewer]    テスト網羅性・AC カバレッジ行列
   └─ [😈 Devil]            横断批判 + 「遠慮」の摘発
   → gh pr review --request-changes (or --approve)
```

`[スクリーンショット 8: PR と reviewer-team のレビュー結果統合]`

詳細な出力例は `apps/InsightLog/demo/review-output-example.md` を参照。

実 Sub-Agent / Skill 定義:
- `apps/InsightLog/.claude/agents/pr-creator.md` (tools: `Bash, Read, Write`)
- `apps/InsightLog/.claude/skills/reviewer-team/SKILL.md` (PM + quality + ux + test + Devil の 5 ロール)

**講師ノート**: pr-creator は **日本語の PR** を前提にしている (description: 「日本語の PR を作成する」)。テンプレート見出しも日本語 (概要 / 変更内容 / 実装確認)。reviewer-team は SKILL（明示呼び出し）として実装されており、Sub-Agent ではない。SubAgent vs Skill の使い分けは「単発の汎用作業 = SubAgent」「複数ロール協働ワークフロー = Skill」と覚えると分かりやすい。

---

## 補足: 各 Sub-Agent の責務 (実 frontmatter 準拠)

| Agent / Skill | 責務 | tools 制限 (実 frontmatter) | 実ファイル |
|----------------|------|------------------------------|------------|
| committer (Sub-Agent) | コミット作成 | `Bash, Read` | `apps/InsightLog/.claude/agents/committer.md` |
| implementer (Sub-Agent) | コード編集 | `Read, Write, Edit, Bash, Glob, Grep` | `apps/InsightLog/.claude/agents/implementer.md` |
| test-writer (Sub-Agent) | ユニットテスト作成 | `Read, Write, Edit, Bash, Glob, Grep` | `apps/InsightLog/.claude/agents/test-writer.md` |
| e2e-planner (Sub-Agent) | E2E 計画 (Markdown 出力) | `Read, Write, Edit, Glob, Grep` | `apps/InsightLog/.claude/agents/e2e-planner.md` |
| e2e-runner (Sub-Agent) | E2E 実行 (MCP) | `Bash, Read, Write, mcp__playwright__*` | `apps/InsightLog/.claude/agents/e2e-runner.md` |
| pr-creator (Sub-Agent) | 日本語 PR 作成 | `Bash, Read, Write` | `apps/InsightLog/.claude/agents/pr-creator.md` |
| planner-team (Skill) | 計画策定 (4 ロール: PM/Searcher/Architect/Devil) | (Skill 内で各 Agent を起動) | `apps/InsightLog/.claude/skills/planner-team/SKILL.md` |
| reviewer-team (Skill) | レビュー (5 ロール: PM/quality/ux/test/Devil) | (Skill 内で各 Agent を起動) | `apps/InsightLog/.claude/skills/reviewer-team/SKILL.md` |

---

## ログの再生（事後分析用）

実 demo の生 JSON ログから、エージェントの全活動を再生できる:

```bash
cat apps/InsightLog/demo/logs/raw_<timestamp>.jsonl | python3 apps/InsightLog/demo/stream-parser.py
```

これは「録画動画が再生できない場合」「録画自体がない場合」の代替素材として有効。ログから `🔧 Tool: ...` の行を抽出すれば、各 Agent が呼び出した tool の履歴が見える。

---

## 講師ノート（Part 6 slide 26d で活用する想定）

- このファイルを VS Code で開き、**ステップ 1-8 を順に読み上げながら** 該当する Sub-Agent / Skill 定義ファイルを並列で開く
- 8 枚のスクリーンショット placeholder は将来撮影して埋め込む（現状はテキストのみで成立する設計）
- 動画再生に失敗した場合の代替として 5-7 分でダイジェスト読み上げ可能
- 「7 体の Sub-Agent + 2 つの Skill」の構造を `ls apps/InsightLog/.claude/agents/ apps/InsightLog/.claude/skills/` で見せると、抽象的な「Agent Teams」が具体的な実装に繋がる

## 関連

- 実 demo: `apps/InsightLog/demo/run.sh` + `apps/InsightLog/demo/pipeline.json`
- レビュー出力例: `apps/InsightLog/demo/review-output-example.md`
- 各 Sub-Agent 定義: `apps/InsightLog/.claude/agents/*.md` (7 体)
- planner-team Skill: `apps/InsightLog/.claude/skills/planner-team/SKILL.md`
- reviewer-team Skill: `apps/InsightLog/.claude/skills/reviewer-team/SKILL.md`
- demo README: `apps/InsightLog/demo/README.md`
