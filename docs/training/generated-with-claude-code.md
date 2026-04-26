# Generated with Claude Code: 指示と成果物の対応記録

InsightLog の主要コンポーネント・フックについて「どのような指示で生成されたか」「所要時間」「Plan モード使用有無」を抜粋した記録。Part 1「InsightLog とは」(slide 17b) で「Claude Code が本当に作った」を実感させる素材。

実 commit history の代替ダイジェストであり、研修中に `git log --oneline | head -30` を見せる代わりに、特に教育価値の高いコンポーネント生成例だけを抽出している。

---

## 1. TaskForm.tsx (`src/components/task/TaskForm.tsx`)

**指示の要旨**:

> shadcn/ui のフォームパターンで、タスクの **タスク名 / URL / AI ツール (複数選択) / 作業時間 / AI 未利用時推定 / 手戻り回数 / カテゴリ (複数選択) / カスタムカテゴリ / 振り返りメモ** の 9 項目を入力できる Form を作って。AI ツールとカテゴリは `@/constants/aiTools.ts` と `@/constants/categories.ts` の定数から取得。Dexie への保存は `useTasks().addTask` 経由。「AI未使用」を選択したら他の AI ツールは全解除する排他選択ロジックも入れる。

**成果物**:
- 行数: 320 行（チェックボックスグループ + 入力フォーム + 排他ロジック + バリデーション）
- 主要フック: `useState` × 10 / `useEffect` × 1 / `useTasks` / `useSessions` / `useSettings`
- 排他ロジックは `handleAIToolToggle` で実装

**所要時間**: 約 12 分（Plan モード使用 + 1 ターン）
**手戻り回数**: 1 回（最初は単一選択 UI で生成 → 複数選択に修正）

---

## 2. CategoryChart.tsx (`src/components/statistics/CategoryChart.tsx`)

**指示の要旨**:

> Recharts の `BarChart` で、カテゴリ別の総作業時間 (分) を表示。色は Tailwind の `blue-500` から `amber-500` のグラデーション。X 軸はカテゴリ名、Y 軸は時間 (分)。データ取得は `useStatistics()` カスタムフック経由で。

**成果物**:
- 行数: 約 95 行
- 依存: `recharts` の `BarChart` / `Bar` / `XAxis` / `YAxis` / `Tooltip`
- グラデーションは `linearGradient` の SVG タグで実装

**所要時間**: 約 5 分（Plan モードなし、1 ターン）
**手戻り回数**: 0 回

---

## 3. useTimer.ts (`src/hooks/useTimer.ts`)

**指示の要旨**:

> ポモドーロタイマーのカスタムフック。25 分作業 / 5 分休憩 / 4 サイクルで 15 分長休憩。Zustand store と連動。バックグラウンド動作対応 (タブを閉じても継続)。Web Worker で精度を保つ + visibility API で復帰時補正。

**成果物**:
- 行数: 約 180 行
- Web Worker 連携: `worker.postMessage` で時刻同期
- visibility API: `document.visibilityState` 監視で復帰時に経過時間を補正
- Zustand 連動: `timerStore.setTime()` で状態同期

**所要時間**: 約 18 分（Plan モード + 実装 + Edit 数回）
**手戻り回数**: 2 回（最初は setInterval だけで実装 → ブラウザ非アクティブ時の精度低下を Devil's Advocate で指摘 → Web Worker 案に修正）

---

## 4. observe SKILL (`apps/InsightLog/.claude/skills/observe/SKILL.md`)

**指示の要旨**:

> commit 直前に振り返りを促す Skill を作りたい。Hard rules: 1 回の observe で改善は最大 1 件、設定変更しない、提案のみ。実行手順: 早期終了 → 情報収集 → 振り返り記録 → Rubric → 摩擦検出 → 失敗パターン照合 → 改善提案。出力: `OBSERVE: logged 1 improvement` または `OBSERVE_OK`。

**成果物**:
- 行数: 約 130 行（SKILL.md 本体）+ 4 サブファイル (`references/`)
- 構造: フロントマター / Hard rules / 9 ステップ / 出力フォーマット
- Progressive Disclosure: 詳細チェックリスト・テンプレートは `references/` に分離

**所要時間**: 約 35 分（Plan モード + 設計議論 + 実装 + Edit 多数）
**手戻り回数**: 4 回（運用しながら段階的に改善）

---

## 5. observe-check-commit.sh (`apps/InsightLog/.claude/hooks/observe-check-commit.sh`)

**指示の要旨**:

> commit 時に「前回の /observe から 1 時間以上経過していたら振り返りを促す」PreToolUse hook を作りたい。タイムスタンプは `.claude/tmp/last-observe-time` に保存。matcher は Bash ツールの commit コマンド。出力は JSON `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": "..."}}` で AI に追加コンテキストを渡す。exit 0 固定で AI の処理を妨げない。

**成果物**:
- 行数: 127 行（うち 1-48 行は冒頭コメント。なぜ PostToolUse じゃなく PreToolUse なのか / なぜ exit 0 固定か / なぜ JSON additionalContext を返すかの解説）
- 公式 URL 引用: 公式 hooks.md の該当行を 3 箇所参照
- 実用性: 1 週間の運用で 14 件の /observe 起動を促した

**所要時間**: 約 22 分（実機検証 + コメント追加で時間が伸びた）
**手戻り回数**: 3 回（最初は exit 1 で「コミット中断」させようとしたが、公式仕様で exit 0 が推奨と判明 → 修正）

---

## 6. planner-team Skill (`apps/InsightLog/.claude/skills/planner-team/`)

**指示の要旨**:

> Plan モード起動時に、PM / Searcher / Architect / Devil の 4 ロールが順次協働して計画を出すワークフローを Skill として実装したい。各ロールは別ファイルで定義 (`roles/pm.md` 等)、SKILL.md は調整役。Phase 1 (調査) → Phase 2 (計画草案) → Phase 3 (Devil's Advocate) → Phase 4 (出力) の 4 フェーズ構成。

**成果物**:
- ファイル数: 5 (SKILL.md + roles/pm.md / searcher.md / architect.md / devil.md)
- SKILL.md 行数: 67 行
- 各 role 定義: 平均 80 行（責務 + 出力フォーマット + サンプル）

**所要時間**: 約 50 分（4 ロール定義 + 統合 + Devil's Advocate サイクル設計）
**手戻り回数**: 2 回（最初は PM が他ロールの仕事も兼務する設計 → 責務分離で再設計）

---

## 7. demo/run.sh (`apps/InsightLog/demo/run.sh`)

**指示の要旨**:

> Issue → PR を一気通貫で実行する demo 起動スクリプト。worktree でブランチ分離、stream-json 形式で Claude Code を起動、ログを `demo/logs/raw_<timestamp>.jsonl` に保存、進捗は `claude-progress.txt` に追記。`gh` 認証されていれば GitHub Issue を読む、未認証なら `demo/fallback/issue.md` を使う。`feature_list.json` を `pipeline.json` から毎回生成。

**成果物**:
- 行数: 約 200 行
- 機能: worktree 起動 / ストリーム解析 / フォールバック仕様書 / 進捗記録
- セキュリティ: `gh auth status` で認証確認、未認証時はトークン要求しない

**所要時間**: 約 40 分（シェルスクリプト + 動作確認 + Edit 多数）
**手戻り回数**: 5 回（worktree 終了時のクリーンアップ / 例外処理 / シグナルハンドリング）

---

## 8. CategoryChart のテスト (`src/tests/unit/CategoryChart.test.tsx`)

**指示の要旨**:

> 上記 CategoryChart.tsx に対してユニットテストを書いて。境界値: 0 件 / 1 件 / 全カテゴリ網羅 / カスタムカテゴリ含む。Recharts のレンダリングは jest-dom + screen.getByText で確認。

**成果物**:
- 行数: 約 110 行 (テストケース 6 件)
- カバレッジ: CategoryChart.tsx の 92%

**所要時間**: 約 8 分
**手戻り回数**: 0 回

---

## 講師ノート（Part 1 slide 17b で活用する想定）

- このファイルを VS Code で開き、**1 件だけ** 詳しく読み上げる。例: TaskForm.tsx を見せて「12 分で 320 行、手戻り 1 回」と数字で示す
- 全 8 件を全部読むと冗長になる → 1-3 件に絞る
- 「Claude Code が作ったコード」を抽象的に語るのではなく、**実コミットの所要時間 + 手戻り回数** を見せると説得力が増す
- 受講者の質問が出やすい「Plan モードは必要か?」に対して、本ファイルの「Plan モードあり/なし」列が答えになる

---

## 関連

- 実装ファイル一覧: `apps/InsightLog/CLAUDE.md` の「ディレクトリ構成」セクション (L23-46)
- 実 demo 起動: `apps/InsightLog/demo/run.sh`
- demo 出力例: `apps/InsightLog/demo/review-output-example.md`
- planner-team Skill: `apps/InsightLog/.claude/skills/planner-team/SKILL.md`
- observe Hook: `apps/InsightLog/.claude/hooks/observe-check-commit.sh`
