# decisions (append-only)

<!--
  改善提案を採用した時だけ追記する。
  /kaizen スキルが自動追記する。
  過去のエントリを編集・削除しないこと（append-only）。
-->

## 2026-03-28 -- Adopted: ユーザー前提の未確認による生成物やり直し
- Why: サンプルデータに限らず、あらゆる生成物で同じ問題が再発するリスクがある
- Expected impact: 生成物のやり直し頻度が減少し、1回目の出力精度が向上する
- Rollback: 確認ステップをスキル定義から削除するだけ

## 2026-03-28 -- 採用: 命名・配置の前提確認が再発防止できていない
- Why: 同セッション内で命名3回・配置2回の変更が発生。前回のappliedが機能していなかった
- Expected impact: 命名・配置の後出し変更がゼロになる
- Rollback: soul.mdから該当行を削除するだけ

## 2026-04-04 -- 採用: 外部ツール出力の未検証 + 裏取りなしの技術提案（2件統合）
- Why: Claude Code の設定値を推測で提案して効かなかった、APIキーエラーで調査せず推測した等、裏取り不足による手戻りが複数回発生
- Expected impact: 推測ベースの提案がゼロになり、ユーザーの信頼が維持される
- Rollback: soul.md から該当行を削除するだけ

## 2026-06-05 -- 自動適用: 重大整合性タスクでのfan-out agents自律起動欠如
- 対象: `.claude/skills/observe/references/checklist.md` — 末尾に「重大タスク受領時のfan-out agents自律提案チェック」セクション追記
- 内容: 「最後」「死活」「致命」等のキーワードをgrepして自律的にfan-out提案を行うチェック項目を追加
- Expected impact: 重大性の高い整合性チェックタスクで自律的にマルチエージェント検証が起動される
- Why: reflection/20260605_insightlog_training_final_audit.md — 「サボってねぇか？fan out agents全部やるべき」指摘から
- Rollback: checklist.mdの追加セクションを削除するだけ
