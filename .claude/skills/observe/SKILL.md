---
name: observe
description: |
  セッションの観察・評価・改善提案を一括実行する。
  (1) 振り返り記録の生成 (2) Rubric スコアリング (3) 摩擦検出と改善提案。
  改善点があれば improvements.md に1件追記。なければ OBSERVE_OK を出力。
  使用場面: セッション終了時、/loop での定期実行、Stop hook からの自動トリガー。
---

# Observe (coach)

## Hard rules

- 1 回の observe で記録する改善は最大 1 件
- タスクを実行しない。設定を変更しない。提案のみ
- 秘密情報をログに書かない
- improvements.md の過去エントリを編集・削除しない
- **データ準備フェーズは必ず `bash scripts/observe-prep.sh` 1 回起動で完結させる**。Bash ツールで `python3` / `python` / `node` 等のインタプリタを直接呼ばない (Codespace 環境には Python が入っておらず確実に詰まる、bash + jq + grep + awk のみで完結する設計)
- observe-prep.sh の出力を読まずに rubric / reflection / improvements を生成しない (commit log と reflection だけで評価する禁止 = 摩擦を必ず見逃す)
- **observe-prep.sh の出力末尾に `=== END ===` がない場合は失敗扱い**。途中で異常終了していないかユーザーに報告して停止する。独自に jsonl を別経路で走査して埋めることは禁止 (Codespace で Python 流出する旧癖の構造的予防)
- **observe-prep.sh が exit code 1 を返した場合**、依存不足 (jq 不在 / scan-patterns.md 不在) かカテゴリ定義不正の致命的エラー。独自走査で迂回せず、エラーメッセージをユーザーに報告して停止する

## アーキテクチャ (責務分離)

このスキルは「**bash 領域 (確定実行)**」と「**AI 解釈領域 (文脈判断)**」を分離する設計:

| 領域 | 担当 | 内容 |
|---|---|---|
| bash 領域 | `scripts/observe-prep.sh` | jsonl パス解決 / 早期終了判定 / heartbeat file 集約 / 強いシグナル grep スキャン |
| AI 解釈領域 | このスキル本体 (Step 3-7) | rubric 判定 / 摩擦検出 / reflection 文章生成 / 改善提案文書化 |

**Codespace で動かない問題への構造的対処**: 旧設計は AI が jsonl 走査方法を自由に判断していたため Python 流出経路が残った。新設計は走査ロジックを bash script に固定、AI は script 出力を文脈解釈するだけ。

## 実行手順

### 1. データ準備 (必須、最初に必ず実行)

Bash ツールで以下を必ず実行:

```bash
bash apps/InsightLog/.claude/skills/observe/scripts/observe-prep.sh
```

(InsightLog repo 単独で開いている場合は `bash .claude/skills/observe/scripts/observe-prep.sh`)

このスクリプトが以下のセクションを含む出力を返す:

- `=== META ===` — 環境変数 / slug / project_dir / patterns_file
- `=== EARLY_EXIT_CHECK ===` — `verdict: continue|early_exit_no_new_work|early_exit_skip_history`
- `=== JSONL_PATHS ===` — 前回 observe 以降に mtime 更新された jsonl 一覧
- `=== HEARTBEAT_FILES ===` — improvements.md / failure-patterns.md / rubric-log.md の tail
- `=== RECENT_REFLECTION ===` — 最新の reflection ファイル全文
- `=== GIT_LOG ===` — 直近 20 件
- `=== SCAN_RESULTS ===` — 旧 scan-strong-signals.sh と同等の grep ヒット数 (カテゴリ別)

### 2. 早期終了判定

observe-prep.sh の `EARLY_EXIT_CHECK.verdict` を読む:

| verdict | 対応 |
|---|---|
| `continue` | Step 3 以降を実行 |
| `early_exit_no_new_work` | `OBSERVE_OK` 出力して終了 (前回 observe 以降に新規 jsonl mtime 更新なし) |
| `early_exit_skip_history` | 警告出力して終了 (`CLAUDE_CODE_SKIP_PROMPT_HISTORY=1` で jsonl 永続化されない環境) |

### 3. session jsonl 精読 (Claude の文脈判断)

`JSONL_PATHS` セクションに列挙された jsonl ファイルを Read ツールで精読する。

- 主軸は **Claude の自然言語理解**。`SCAN_RESULTS` の grep ヒット数は補助 (下限サニティチェック)
- 各 user 発話について「怒り / 手戻り / 検証怠り / 過剰修正 / 反復指示」のどれに該当するかを文脈で判定
- 巨大 jsonl (10MB 超) の場合は分割読み (offset / limit を使い、user 発話部分を中心に読む)
- commit log と reflection だけで評価する禁止 (摩擦を必ず見逃す)

### 4. 振り返り記録

[テンプレート](./references/reflection-template.md) に従い、`docs/memory/reflection/YYYYMMDD_{title}.md` を生成する。

5 セクション必須: Handshake / 摩擦ポイント / 得られた知見 / 次回アクション / 刺さったフレーズ + Rubric Score セクション。

### 5. Rubric スコアリング

5 基準 10 点満点で評価。**判定根拠は session jsonl 精読 + SCAN_RESULTS の補助値**:

| 基準 | 配点 | 判定方法 |
|------|------|----------|
| 手戻り率 | 3 | やり直し 0 回=3, 1 回=2, 2 回=1, 3 回以上=0 |
| 指示理解度 | 2 | 修正指示 0 回=2, 1 回=1, 2 回以上=0 |
| 前提確認 | 2 | 必要な前提を全確認=2, 一部漏れ=1, 確認なし=0 |
| 動作検証 | 2 | 全変更を検証=2, 一部=1, 未検証=0 |
| 後片付け | 1 | 残骸なし=1, あり=0 |

スコアを reflection ファイルの Rubric Score セクションに記録 + `docs/memory/heartbeat/rubric-log.md` に 1 行追記:

```
YYYY-MM-DD | N/10 | 手戻りN 指示N 前提N 検証N 片付けN | {セッション概要}
```

### 6. 摩擦検出

[チェックリスト](./references/checklist.md) に従い 6 観点を検出:

1. 同じエラーの 2 回以上の発生
2. 前提条件の欠落
3. 曖昧なプロンプト
4. リスクの高い操作
5. 過度な冗長性
6. 手順の抜け漏れ

既に improvements.md (HEARTBEAT_FILES セクション参照) に記録済み (Status: proposed / applied) の問題は除外。Status: applied なのに再発している場合は failure-patterns.md を更新 + 新規 entry 化。

### 7. 失敗パターン照合

`docs/memory/heartbeat/failure-patterns.md` (HEARTBEAT_FILES セクション参照) と照合:
- 既知パターン該当 → 発生回数 / 最終発生日を更新
- 新規パターン → 新しい行を追加

### 8. 改善提案

摩擦検出時は [テンプレート](./references/improvement-template.md) に従い `docs/memory/heartbeat/improvements.md` 末尾に **1 件だけ** 追記。

複数検出時は **最もインパクトが大きい 1 件のみ**。Rubric が特定基準で 8.0/10 を下回っていれば、その基準関連を優先。

### 9. 出力

- 改善を記録した場合:
  ```
  OBSERVE: logged 1 improvement -- "{short title}" (rubric: N/10)
  ```
- 記録なし:
  ```
  OBSERVE_OK (rubric: N/10)
  ```
- 未レビューの proposed が 2 件以上溜まっている場合:
  ```
  OBSERVE_OK (rubric: N/10, 注意: 未レビューの提案が{N}件。/evolve で処理してください)
  ```

### 10. /evolve の自動実行 (必須)

Step 1〜9 完了後、続けて `/evolve` を必ず実行する。

- /evolve の hard rule で安全性担保: 1 回 1 件最大、低リスクのみ自動適用、高リスクは人間承認キュー
- observe が出した新 proposed を同サイクル内で即リスク判定 + 自動適用範囲のみ反映
- 高リスクが残れば「重要判断が必要な改善があります、承認 / 却下してください」とリマインド

observe 出力に続けて 2 行目に evolve 結果を追加:

```
EVOLVE: {出力パターン}
```

### 11. 実行時刻の記録 (commit-hook 連携用)

最後に observe 最終実行時刻を記録:

```bash
mkdir -p "${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/tmp"
date -u +%s > "${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/tmp/last-observe-time"
```

このタイムスタンプは `.claude/hooks/observe-check-commit.sh` (PostToolUse hook) が読み、前回 /observe から 1 時間以上経過していたら次の git commit 完了後に Claude へ「/observe → /evolve 連続実行を推奨」のメッセージを差し込む。記録忘れると hook が「実行記録なし」判定で毎回プロンプトが出るので必ず実行。

---

## 設計メモ (改修履歴)

### 2026-05-05: 旧 scan-strong-signals.sh を observe-prep.sh に統合 + Codespace 対応

**問題**: GitHub Codespaces (devcontainer に Python 不在) で `/observe` 手動実行時、AI が SKILL.md L57-66「session jsonl 走査手順」を読んでも具体的な走査方法が AI 自由判断、Bash ツールで `python3 -c "import json; ..."` 起動して `python3: command not found` で詰まる事故が発生。

**改修**: SKILL.md を「指示書 + 固定実行 script」分離型に再設計。

- `scripts/observe-prep.sh` 新規 (旧 scan-strong-signals.sh 機能を内包 + early-exit 判定 + heartbeat 集約 + reflection / git log 取得)
- `scripts/scan-strong-signals.sh` 削除 (機能は observe-prep.sh 内、aidx-training 側は別 SKILL.md で従来運用継続)
- SKILL.md 大幅改稿 (Step 1 で必ず observe-prep.sh 起動を明示、AI 自由判断を構造的に削減)

**依存**: bash 3.2+ (macOS 互換), jq, grep, awk のみ (devcontainer Dockerfile で apt install jq 済)。
