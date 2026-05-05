# observe scan patterns

observe SKILL.md の `scan_strong_signals` 関数で参照する補助 grep パターン定義。本ファイルを編集すれば次回 /observe からパターン拡充 / 削除が即反映される。

## このファイルの読み方 (30 秒)

- 各 `## カテゴリ名 (日本語)` 直下の **空行 1 行 + パターン本体 1 行** が grep `-E` 用正規表現 (`|` 区切り、空白厳禁)
- パターン追加: 該当カテゴリの行末に `|新パターン` を付ける (前後空白を入れない、`|` 隣接で空マッチを作らない)
- パターン削除: `|` を巻き込んで削る (隣接 `||` を残すと空マッチで全行ヒット事故)
- カテゴリ追加: 本ファイルに `## 新カテゴリ (日本語ラベル)` を足すだけで反映される (`scripts/observe-prep.sh` がカテゴリを自動 auto-derive、SKILL.md / observe-prep.sh の同時編集は不要)
- 動作環境: bash + awk + jq + grep (macOS / Linux 標準ツール、Python / Node 不要)
- **fail-closed 警告**: パターン本体が空または空白のみだと `observe-prep.sh` は exit 1 で即停止 (空 `skill_origin_markers` で user 全消去 / 空パターンで grep 全行マッチ事故を構造的に防止)
- **awk loader 仕様**: 見出し直後の `空行` / `意図:` で始まる行 / `^# ` コメント行はスキップ、最初の非空非コメント行をパターンとして取得。次の `## ` 見出しに到達したら停止 (自由文追記耐性、編集者が補足を増やしても誤読しない)
- 各カテゴリの「意図:」コメントは複数行に分けず 1 行で書く (`意図:` で始まる行のみスキップ対象、改行後の続き行は最初のパターン候補と誤読される可能性)

## observe-prep.sh との関係 (SST = Single Source of Truth)

```
scan-patterns.md (本ファイル、カテゴリ正本)
  ↓ list_categories で auto-derive
scripts/observe-prep.sh (走査ロジック、固定実行)
  ↓ === SCAN_RESULTS === セクションに出力
SKILL.md (AI 解釈領域、出力を文脈解釈)
∴ カテゴリ追加 / 削除 = 本ファイル 1 箇所編集だけで反映
   (旧 scan-strong-signals.sh + SKILL.md 二重定義は 2026-05-05 改修で解消)
```

## 運用ガイド (Hard rule ではなく目安、Claude が一次判定権限)

1. 補助 grep 値が高くても、純 user 発話精読で実摩擦を確認してから rubric に反映する (skill 由来 text の self-reference 構造により補助 grep 値が誇張されることがある)
2. grep パターンに引っかからなくても、文脈で怒り / 苛立ち / 反復指示を読み取れたら Claude の判定を優先する (grep は補助、Claude が一次判定権限を持つ)
3. パターンの true / false positive 比率は当該日のセッションログで定期的に再測定する (過去事案派生、サンプリング根拠を本ファイル冒頭に明記)

## サンプリング根拠 (2026-04-30 複数 jsonl 実機検証)

対象: 当該日に mtime 更新された session jsonl 2 件を `jq -rc 'select(.type=="user") | .message.content | if type=="array" then map(select(.type=="text") | .text) | .[] else . end // ""'` で純 user text 抽出 (tool_result を分離)、各カテゴリの grep `-cE` ヒット数を測定:

| カテゴリ | jsonl-A (3,270 行) | jsonl-B (12,853 行、85MB 長寿命メイン) | 旧 tostring 全行 grep (jsonl-A 比較) | 削減率 (A) |
|---|---|---|---|---|
| anger | **20** | **8** | 45 | 55% |
| rework | **32** | **129** | 59 | 45% |
| emphasis_chars | **1** | 未測定 | 未測定 | -- |
| imperative | **0** | 未測定 | 未測定 | -- |
| unmodified_change | **10** | **23** | 14 | 64% |
| hands_on_check | **10** | **25** | 14 | 64% |
| negative_pressure | **0** | 未測定 | 未測定 | -- |

純 user text 抽出により self-reference 由来の false positive が 45-64% 削減 (jsonl-A 単独の旧/新比較)。jsonl-B (長寿命メイン、85MB) でも同様の削減傾向を確認 (anger 旧 77→新 8、rework 旧 265→新 129、Codex Layer 3 実機実証)。`imperative` / `negative_pressure` が 0 件なのは jsonl-A セッションが「false positive 大量検出だが実摩擦 0-1 件」だったことに整合 (前 observe で評価)、jsonl-B 含む長期分布での再測定は次回 /observe で継続。

---

## skill_origin_markers (skill 由来 text の除外フィルター)

意図: jq の `.message.content` が文字列の場合、稀に skill 起動時の system payload (system-reminder / Skill base directory ヘッダ / command-name タグ) や Read tool 結果の行頭 `^数字→` プレフィックスが user role として混入する。これらを scan 対象から除外して self-reference 由来の false positive を抑制する。fail-closed 原則 (空文字なら exit 2、user 発話を全消去する事故を構造的に防止)。

<system-reminder>|Base directory for this skill|<command-name>|^[[:space:]]*[0-9]+→|grep -cE

## anger (強い怒り表現)

意図: 罵倒語 + 二人称強圧の同時出現で「ユーザーが Claude に向けて発する強い不満」を検出。一般会話の「バカだなあ」誤検出は受容 (recall 優先)。

ふざけ|お前.*が|ボケ|バカ|馬鹿|アホ|あほ|クソ|くそ|うざい|うっせ|黙れ|死ね|キレ|キモ

## emphasis_chars (強調記号連続)

意図: `!` `？` `?` の 3 個以上連続を検出 (1-2 個は通常表現、3 個以上から強い感情シグナル)。半角全角混在の表記揺れに対応。

!{3,}|！{3,}|？{3,}|[?]{3,}

## imperative (命令調強圧)

意図: 「何回言ったら」「もう何回」「ちゃんとしろ」系の反復指示の苛立ち表現を検出。同じ修正を繰り返し指示している摩擦シグナル。

もう何回|何度言|何度も|また同じ|何でやら|何で.*ない|やれよ|ちゃんと.*しろ|まず.*しろ|早くしろ|急げ|サボるな

## unmodified_change (変更未反映指摘)

意図: 「変わってない」「どこ変えた」系の、Claude の修正がユーザー側で確認できなかったケースを検出。手戻り原因の典型。

変わってない|どこ変えた|反映されて

## hands_on_check (実地検証要求)

意図: 「自分で確認しろ」「実地で見ろ」系の、Claude が推測ベースで答えてユーザーから検証を要求された場面を検出。

自分で確認|自分の目で見|可能性が高い

## rework (手戻り言及)

意図: 「手戻り」「もう一回」「何回言ったら」系の、ユーザーが手戻り発生を明示的に言及している場面を検出。

手戻り|手取り|もう一回|何回言

## negative_pressure (否定強圧)

意図: 「動かない」「使えない」「意味不明」「わからない」系の、Claude の出力に対する否定的評価を検出。動作不良の摩擦シグナル。

動かない|使えない|意味不明|わからない|わからん|意味ないだろ|何言ってる
