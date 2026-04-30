# rubric-log 記入例

`rubric-log.md` の `| Date | Score | ... | Session |` 表の末尾に追記する 1 行分の記入例。reflection の Rubric Score セクションと数値整合させる。

## ヘッダー (rubric-log.md 既存ヘッダー)

```
| Date | Score | 手戻り | 指示 | 前提 | 検証 | 片付け | Session |
|------|-------|--------|------|------|------|--------|---------|
```

## 1 行追記の記入例

```
| 2026-04-20 | 5/10 | 1 | 2 | 1 | 1 | 0 | バイブコーディング vs SDD 比較で配置ルール不足が露呈 |
```

## 記入の要点

- Date: ISO 形式 `YYYY-MM-DD`
- Score: 合計 / 10 (reflection の Rubric Score テーブル合計と一致させる)
- 5 列の内訳: 手戻り (3 満点) / 指示 (2) / 前提 (2) / 検証 (2) / 片付け (1) の各スコア
- Session: 当該セッションの主題を 1 文で要約。固有の Issue 番号や commit SHA は書かず、技術的な論点だけを残す
