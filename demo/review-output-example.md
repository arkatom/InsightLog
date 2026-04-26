# Demo Output Example: Issue → PR レビューコメント

このファイルは `demo/run.sh` が生成した実際の PR の各種出力例（の標準化された再現）。
受講者向け研修 Part 1 「デモの成果確認」で講師が VS Code エディタで開いて読み上げるための素材。

実運用では `demo/logs/raw_<timestamp>.jsonl` から実際の生成内容を抽出するが、ライブ実行が間に合わなかった場合や講師がパターンを示したい場合のために、典型例をここにまとめる。

---

## 1. PR タイトル + 説明（committer / pr-creator の出力）

`committer` がコミット、`pr-creator` が PR を起票する。実ファイル: `apps/InsightLog/.claude/agents/committer.md`, `apps/InsightLog/.claude/agents/pr-creator.md`。

### 例: PR タイトル

```
feat(task): タスクフォームに必須バリデーション表示を追加 (Closes #5)
```

### 例: PR 説明

```markdown
## Summary

タスク記録フォームの必須フィールド（タスク名 / 作業時間 / カテゴリ）に「※必須」を赤字で表示し、未入力時はフィールド境界を赤くハイライトする。Issue #5 の AC1-AC4 を満たす。

## Test plan

- [x] ユニット: TaskForm.tsx の必須バリデーションテスト 5 件 (空 / 半角空白 / 一部入力 / 全入力 / カスタムカテゴリ)
- [x] E2E: 必須未入力で送信 → エラー表示確認 (Playwright MCP)
- [x] 既存テスト: 23 / 23 passed
- [x] Type check: 0 errors

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

---

## 2. 自動テスト結果（test-writer / e2e-runner の出力）

`test-writer` がユニットテスト、`e2e-planner` + `e2e-runner` が E2E テスト計画と実行。

### 例: ユニットテスト結果（Vitest）

```
✓ src/tests/unit/TaskForm.test.tsx (5)
  ✓ 全フィールド空で送信 → エラー 3 件表示
  ✓ タスク名のみ入力 → 残り 2 件のエラー表示
  ✓ 半角空白だけのタスク名 → エラー (trim ロジック確認)
  ✓ 全必須フィールド入力 → 送信成功
  ✓ カスタムカテゴリ入力時もバリデーション動作

Test Files  1 passed (1)
     Tests  5 passed (5)
  Duration  624ms
```

### 例: E2E テスト結果（Playwright MCP）

```
✓ task-form-required-validation.spec.ts (3)
  ✓ 必須未入力で送信 → エラーが赤字で 3 箇所表示される
  ✓ タスク名 + 時間入力 → カテゴリのみエラー
  ✓ 全入力 → 一覧画面に新規 task が追加される

Tests: 3 passed
Time: 8.2s
```

### 例: Type check + Lint

```
$ npm run build
✓ tsc --noEmit (0 errors)
✓ vite build  (built in 3.12s)
```

---

## 3. レビュアー視点別コメント（reviewer-team の各ロール）

`apps/InsightLog/.claude/skills/reviewer-team/SKILL.md` の 5 ロール（PM / quality / ux / test / Devil）が並列でレビュー。

### Quality Reviewer の例

```markdown
## quality-reviewer レビュー

### 重大な問題
（なし）

### 中程度の問題
- L42: `useEffect` の依存配列に `selectedCategory` が含まれていない可能性。状態変化時にバリデーションが再実行されないリスク。
- L67: `e.target.value.trim()` の型推論が `string | undefined` になる可能性。`?? ''` でフォールバックすべき。

### 軽微な懸念
- L23: `// TODO: i18n対応` のコメントが残っている。Issue #5 のスコープ外だが、別 Issue で起票推奨。

### 結論
中程度 2 件の対応後に承認可能。
```

### UX Reviewer の例

```markdown
## ux-reviewer レビュー

### 重大な問題
- バリデーションメッセージの文字色 `#FF0000` がアクセシビリティ AA を満たしていない（コントラスト比 4.5:1 を切る）。`#D32F2F` (Material Red 700) 推奨。

### 中程度の問題
- 「※必須」のフォントサイズが本文より小さく、可読性が低い。`small` クラスではなく本文と同じ `1.4rem` で統一を推奨。

### 軽微な懸念
- エラーメッセージが画面読み上げソフトに自動アナウンスされない。`role="alert"` または `aria-live="polite"` の付与を推奨。

### 結論
重大 1 件 + 中程度 1 件の対応後に承認可能。
```

### Test Reviewer の例

```markdown
## test-reviewer レビュー

### AC カバレッジ行列

| 受け入れ条件 | 対応するテスト | カバー状況 |
|--------------|----------------|------------|
| AC1: 必須未入力で送信不可 | TaskForm.test.tsx L18-32 | ✅ |
| AC2: 「※必須」赤字表示 | task-form-required-validation.spec.ts L24-38 | ✅ |
| AC3: 全入力で送信成功 | TaskForm.test.tsx L62-78 | ✅ |
| AC4: カスタムカテゴリも対象 | TaskForm.test.tsx L80-95 | ✅ |
| AC5: 半角空白のみは無効 | TaskForm.test.tsx L34-50 | ✅ (境界値) |

### 重大な問題
（なし、全 AC をテストでカバー）

### 中程度の問題
- `validateRequired()` 関数の境界値テストが 1 件不足。`null` を渡したときの挙動が未テスト。

### 軽微な懸念
- カバレッジ 87%（目標 80%）✅。ただし新規追加した `formatErrorMessage()` のカバレッジが 60% で局所的に低い。

### 結論
中程度 1 件の対応後に承認可能。
```

### Devil（横断批判）の例

```markdown
## Devil's Advocate

### 重大な追加指摘
- 3 Reviewer が全員「重大なし」と書いた `useFormValidation` カスタムフックだが、**多重起動時の race condition** が考えられる。E2E テストでは単発操作しか検証していないため、ユーザーが連打すると古い state でバリデーションが走る可能性がある。

### 再分類すべき指摘
- quality の「中程度: 依存配列に selectedCategory なし」は、`selectedCategory` が必須フィールドの 1 つである以上、**重大に再分類すべき**。これがバグると AC1 が崩壊する。

### 「遠慮」の摘発
- ux の「軽微: aria-live 未付与」は、アクセシビリティ AA 準拠を Issue 文中で明記している以上、軽微ではなく **中程度** が妥当。

### 結論
**差し戻し（changes-requested）**。重大 1 件 + 再分類 1 件 + 中程度修正 1 件。
```

---

## 4. PM の統合レポート + GitHub 投稿（最終出力）

```markdown
## レビュー結果（多角的レビュー）

### 受け入れ条件チェック

| 受け入れ条件 | 状態 | 備考 |
|--------------|------|------|
| AC1: 必須未入力で送信不可 | ⚠️ 要修正 | useFormValidation の race condition で AC1 が崩れる可能性 |
| AC2: 「※必須」赤字表示 | ⚠️ 要修正 | コントラスト比が AA 未達 (#FF0000 → #D32F2F) |
| AC3: 全入力で送信成功 | ✅ |  |
| AC4: カスタムカテゴリも対象 | ✅ |  |
| AC5: 半角空白のみは無効 | ✅ |  |

### コード品質

quality / ux / test / Devil の 4 観点でレビューしました。
**重大 2 件 + 中程度 2 件** の指摘があります。詳細は Devil's Advocate の追加指摘を参照してください。

### 指摘事項

1. (重大) `useFormValidation` の race condition 検証 + E2E に連打シナリオ追加
2. (重大) バリデーションメッセージの色を `#D32F2F` に変更
3. (中程度→重大に再分類) `useEffect` の依存配列に `selectedCategory` を追加
4. (中程度→中程度) `aria-live="polite"` を付与してスクリーンリーダー対応

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

GitHub に `gh pr review --request-changes` で投稿される。

---

## 5. 実コミット情報の例

```
commit abc1234567890def
Author: Claude Code Bot <noreply@anthropic.com>
Date:   2026-04-26 14:35:21 +0900

    feat(task): タスクフォームに必須バリデーション表示を追加 (Closes #5)
    
    diff: +127 / -34
    files changed: 5
      M src/components/task/TaskForm.tsx
      M src/components/task/TaskItem.tsx
      A src/lib/validators.ts
      A src/tests/unit/TaskForm.test.tsx
      A src/e2e/task-form-required-validation.spec.ts
```

---

## 講師ノート（Part 1 slide 23 で活用する想定）

- このファイルを VS Code で開いて、**Section 3** から順に「複数のレビュアー視点が並列で動く」イメージを示す
- 特に **Devil's Advocate の追加指摘** を見せると、「3 人の同意 = 安全」ではなく「Devil が再批判する仕組み」が品質を支えていることが分かる
- 「実 demo を待ちきれない場合の代替素材」として、ライブ実行のフォールバックにも使える
- 実演中は `demo/logs/raw_<timestamp>.jsonl` を `python3 demo/stream-parser.py` で再生して「リアルな生成過程」と「整形された結果」の両方を見せると効果的

## 関連

- 実装手順書: `apps/InsightLog/.claude/skills/reviewer-team/SKILL.md`
- 実 Sub-Agent 定義: `apps/InsightLog/.claude/agents/cc-feature-review.md`, `committer.md`, `pr-creator.md`, `test-writer.md`, `e2e-planner.md`, `e2e-runner.md`, `implementer.md`
- Walkthrough: `apps/InsightLog/demo/agent-teams-walkthrough.md`
- 起動: `apps/InsightLog/demo/run.sh` + `apps/InsightLog/demo/pipeline.json`
