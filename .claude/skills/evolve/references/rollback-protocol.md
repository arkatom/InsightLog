# ロールバックプロトコル

改善適用後に品質が低下した場合の対処手順。

## 自動ロールバックのトリガー

1. **Rubric スコアの悪化**: 改善適用直後のセッションでスコアが2点以上下がった場合
2. **同種の摩擦の再発**: verified に移行できず、同じ Symptom が再発した場合

## ロールバック手順

1. `decisions.md` から該当エントリの Rollback 手順を読む
2. `git log` で該当の変更コミットを特定する
3. 対象ファイルを元に戻す（手動で修正する）
4. `improvements.md` に新しいエントリを追加:
   ```markdown
   ## YYYY-MM-DD -- ロールバック: {元の改善タイトル}
   - Symptom: {元の改善タイトル}の適用後にRubricスコアがN→Nに低下（または同種の摩擦が再発）
   - Root cause: 元の改善の Fix が不適切 / 副作用あり
   - Fix: ロールバック済み。根本原因を再分析して別アプローチを提案
   - Preventive check: rubric-log.md の直近スコアを確認
   - Expected impact: スコアの回復
   - Risk & rollback: ロールバック自体のリスクなし
   - Risk-level: low
   - Rubric impact: {元の改善の Rubric impact}
   - Status: proposed
   ```
5. `decisions.md` に記録:
   ```markdown
   ## YYYY-MM-DD -- ロールバック: {元の改善タイトル}
   - Why: Rubric スコアが N → N に低下（または摩擦再発）
   - Action: ファイルを元の状態に復元
   ```

## 制限事項

- コードの自動 revert は行わない（人間に通知して判断を委ねる）
- ロールバック対象が high-risk ファイルの場合は、人間に通知のみ
