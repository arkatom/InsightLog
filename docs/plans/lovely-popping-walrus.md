# OpenClaw再現スキル実装計画

## Context

Zenn記事（https://zenn.dev/akasara/articles/52dc506100f7ad）のOpenClaw — 自己強化エージェントフレームワークをClaude Codeスキルとして再現する。

OpenClawの核心は**main（実務）とcoach（監督）の責務分離**と、**Heartbeatによる定期的な改善蓄積サイクル**。Claude Codeはセッションベースのため、常駐デーモンではなくスキル起動型に変換する。

## 変換マッピング

| OpenClaw | Claude Code実装 |
|----------|----------------|
| main（実務） | 通常セッション（変更不要） |
| coach（監督） | `/openclaw-heartbeat` スキル |
| SOUL.md（憲法） | `.claude/instructions/openclaw/soul.md`（全セッション自動ロード） |
| HEARTBEAT.md | スキル内references |
| memory/improvements.md | `docs/_openclaw/improvements.md`（append-only） |
| memory/decisions.md | `docs/_openclaw/decisions.md`（append-only） |
| handshake.md | 既存reflectionスキルにセクション追加 |
| 30分定期実行 | `/loop 30m /openclaw-heartbeat` |
| 人間承認 | `/openclaw-adopt` スキル |

## 作成ファイル一覧（10ファイル）

### Phase 1: 基盤（3ファイル）
1. `.claude/instructions/openclaw/soul.md` — 不変憲法（責務分離・安全ルール）
2. `docs/_openclaw/improvements.md` — 改善ログ初期テンプレート
3. `docs/_openclaw/decisions.md` — 採用記録初期テンプレート

### Phase 2: Heartbeatスキル（3ファイル）
4. `.claude/skills/openclaw-heartbeat/references/heartbeat-checklist.md` — チェック観点・Root Cause 6分類
5. `.claude/skills/openclaw-heartbeat/references/improvement-template.md` — 改善ログ記入フォーマット
6. `.claude/skills/openclaw-heartbeat/SKILL.md` — coachスキル本体

### Phase 3: 採用管理スキル（1ファイル）
7. `.claude/skills/openclaw-adopt/SKILL.md` — proposed項目のレビュー・採用・却下

### Phase 4: 既存スキル統合（2ファイル修正）
8. `.claude/skills/reflection/references/template.md` — handshakeセクション追加
9. `.claude/skills/reflection/SKILL.md` — handshake記録手順（手順6）追加

### Phase 5: CLAUDE.md更新（1ファイル修正）
10. `CLAUDE.md` — ディレクトリ構成にopenclaw関連を追記

## 各ファイルの設計概要

### soul.md
- Priorities: Safety > Accuracy > Brevity
- main/coachの責務分離ルール
- append-onlyログルール
- 秘密情報記録禁止
- 既存 `core/base.md` と補完関係（衝突なし）

### openclaw-heartbeat SKILL.md
- **Hard rule**: 1 Heartbeat = 最大1改善
- 情報収集: improvements.md + 最新reflection + git log -20
- heartbeat-checklist.mdに基づく摩擦検出
- 検出あり → improvements.mdに1件追記、なし → `HEARTBEAT_OK`
- 早期終了: 前回Heartbeat以降に新しいreflectionがなければ即OK
- 禁止: タスク実行・設定変更・自動適用・2件以上の記録

### heartbeat-checklist.md
- 6つの検出観点（同じエラーの繰り返し、前提条件欠落、曖昧なプロンプト、リスク操作、冗長性、手順抜け）
- Root Cause 6分類: config / prompt / procedure / permission / tool / external

### improvement-template.md
- フォーマット: Symptom, Root cause, Fix, Preventive check, Expected impact, Risk & rollback, Status
- Status遷移: proposed → applied → verified（or rejected）
- Preventive checkは具体的コマンド必須

### openclaw-adopt SKILL.md
- improvements.mdからproposed項目を一覧表示
- ユーザーにadopt/reject/skipを選択させる
- adopt → Status更新 + decisions.mdに記録
- 適用手順は提示のみ（自動実行しない）

### reflection修正
- テンプレートに `## Handshake (main → coach)` セクション追加
  - やったこと、結果、詰まり/違和感、次回の懸念（各1-2行）
- SKILL.mdに手順6追加（docs/_openclaw/が存在する場合のみhandshake記録）
- OpenClawなしでも単体動作を維持

## 既存スキルとの関係

- **reflection**: 小さく拡張（handshakeセクション追加のみ）
- **improve**: 変更なし。共存。improveはマクロ（パターン抽出）、heartbeatはミクロ（1件の摩擦検出）
- **team / planner-team / reviewer-team**: 無関係。変更なし

## 検証手順

1. `/openclaw-heartbeat` 手動実行 → 変更なしの状態で `HEARTBEAT_OK` が出力される
2. `/reflection` 実行 → 振り返りファイルにhandshakeセクションが含まれる
3. `/openclaw-heartbeat` 再実行 → reflectionを分析し、摩擦があればimprovements.mdに1件追記
4. `/openclaw-adopt` 実行 → proposed項目が一覧表示され、adopt/reject/skipの選択ができる
5. improvements.mdが append-only で運用されていることを確認
