# improvement 記入例

`improvements.md` の末尾に追記する 1 エントリ分の記入例。reflection の摩擦ポイントから派生して書く。

## 2026-04-20 -- CLAUDE.md に新規コンポーネントの配置ルールを追記

- Symptom: SDD 再実装で新規作成された RequiredBadge コンポーネントが `src/RequiredBadge.tsx` (ルート直下) に配置された。既存コンポーネントは全て `src/components/ui/` にあるが、CLAUDE.md に新規ファイルの配置先が明記されていなかったため AI が推測で配置した
- Root cause: config -- CLAUDE.md のディレクトリ構成セクションに「新規コンポーネントの配置先」ルールが不足
- Fix: CLAUDE.md のコンポーネント設計セクションに「新規の再利用可能コンポーネントは `src/components/ui/` に配置する。機能固有のコンポーネントは `src/components/{feature}/` に配置する」を追記
- Preventive check: `git diff` で新規 `.tsx` ファイルの配置先を確認。`src/` 直下に新規 `.tsx` が作られていたら警告
- Expected impact: 新規コンポーネントの配置ミスがゼロになる。手動移動の手戻りも解消
- Risk & rollback: 追記による副作用はない。不要と判断されれば該当セクションを削除するだけで戻せる
- Risk-level: low
- Rubric impact: 後片付け + 前提確認
- Status: proposed
