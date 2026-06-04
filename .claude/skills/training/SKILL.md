---
name: training
description: >
  研修の実習・ハンズオン手順を Codespace 内で VS Code で開くスキル。
  $ARGUMENTS に英語スラッグ（compare / simplify / multi-layer-guard 等）または
  日本語キーワード（3層防御 / タスクフォーム / ダッシュボード 等）を指定すると、
  docs/training/ から該当する Markdown ファイルを code コマンドで開く。
  引数なしで全件一覧を表示。
  使用場面: (1) 受講者が手順書を手元で開きたいとき、
  (2) 講師が研修中に該当手順を案内するとき、
  (3) 「/training compare」「/training 3層防御」等の呼び出し。
---

# Training Material Opener

研修の実習・ハンズオン手順書を素早く Codespace 内で開くスキル。

## 動作概要

`docs/training/*.md` 配下の手順書を対象に、キーワードでマッチングして VS Code で開く。手順書には YAML front-matter が付いており、`type` / `title` / `slug` / `aliases` を読み取って柔軟に検索できる。

## $ARGUMENTS の解釈

| 入力 | 挙動 |
|------|------|
| （引数なし） | 全件一覧表示（type ごとにグループ化） |
| `handson` または `ハンズオン` | ハンズオンのみ一覧 |
| `jisshu` または `実習` | 実習のみ一覧 |
| `list` | 全件一覧（引数なしと同じ）|
| それ以外 | キーワード検索（下記マッチング手順へ）|

## 実行手順

### 1. 一覧情報の取得

1. `docs/training/*.md` を列挙する（`README.md` は除外）
2. 各ファイルの冒頭の YAML front-matter から以下を読み取る:
   - `type`: `jisshu` または `handson`
   - `title`: 日本語の正式タイトル
   - `slug`: 英語の短い識別子
   - `aliases`: 別名の配列（英語 + 日本語）

### 2. 引数が空または `list` の場合

全件を type ごとにグループ化して表示:

```
📚 研修の実習・ハンズオン手順

【ハンズオン】
  compare              CLAUDE.md の有無で比較

【実習】
  my-style             InsightLog を自分仕様にする
  simplify             タスク記録フォームを簡単にする
  required-annotation  必須フィールドの注釈表示
  observe-evolve       振り返りと改善サイクルを体験
  research-ai          既存スキルに新機能を1つ追加する
  observe-hook         commit 後に振り返りを促す仕組みを作る
  multi-layer-guard    AI に「してはいけないこと」を設定する（3層防御）
  kpi-dashboard        InsightLog の記録を経営層向け報告書に変換する

使い方: /training <スラッグ or 日本語キーワード>
```

### 3. 引数が `handson` / `ハンズオン` / `jisshu` / `実習` の場合

該当する type のみを一覧表示。

### 4. その他のキーワードの場合（マッチング）

以下の優先順で判定:

**Step A: 完全一致**
- `slug` または `aliases` の要素に完全一致するファイルがあれば、**即それを開く**

**Step B: 部分一致（大文字小文字を無視）**
- `slug`・`title`・`aliases` にキーワードが部分一致するファイルを候補にする
- 候補が **1件** ならそれを開く
- 候補が **複数** なら候補リストを提示して選択を促す

**Step C: 意味的マッチ（LLM の判断）**
- 部分一致がない場合、キーワードの意味から `title` や `aliases` に意味的に近いものを推測
- 推測した候補が1つ明確ならそれを開く前に「これを開きますか？」と確認
- 複数候補がありうる場合は候補リストを提示

**Step D: 該当なし**
- どのステップでもマッチしなければ、全件一覧を表示して「以下から選んでください」と促す

### 5. ファイルを開く

マッチしたファイルは以下で開く:

```bash
code docs/training/<filename>.md
```

VS Code が既に開いていれば、新しいタブで該当ファイルが表示される。

## 具体例

```
# 完全一致
/training compare              → docs/training/part2-1-claudemd-compare.md を開く
/training required-annotation  → docs/training/part3-1-required-annotation.md を開く
/training observe-evolve       → docs/training/part4-1-observe-evolve.md を開く
/training research-ai          → docs/training/part5-1-research-ai.md を開く
/training observe-hook         → docs/training/part6-1-observe-hook.md を開く
/training multi-layer-guard    → docs/training/part7-1-multi-layer-guard.md を開く
/training kpi-dashboard        → docs/training/part8-1-kpi-dashboard.md を開く

# 部分一致（唯一マッチ）
/training task           → docs/training/part2-2-task-form-simplify.md を開く
/training 必須           → docs/training/part3-1-required-annotation.md を開く
/training 改善           → docs/training/part4-1-observe-evolve.md を開く
/training 3層            → docs/training/part7-1-multi-layer-guard.md を開く
/training ダッシュボード  → docs/training/part8-1-kpi-dashboard.md を開く

# 部分一致（複数）
/training claude         → 候補を提示: part2-1-claudemd-compare.md

# 意味的マッチ
/training クロードの比較    → 推測: part2-1-claudemd-compare.md を開きますか？
/training ブレーキ          → 推測: part7-1-multi-layer-guard.md を開きますか？
/training 報告書            → 推測: part8-1-kpi-dashboard.md を開きますか？

# 一覧
/training                → 全件一覧
/training handson        → ハンズオンのみ一覧
/training 実習           → 実習のみ一覧
```

## 新規手順ファイルの追加方法

`docs/training/<slug>.md` を新規作成し、冒頭に以下の front-matter を付ける:

```yaml
---
type: jisshu           # jisshu または handson
title: 日本語の正式タイトル
slug: short-name       # 英語の短い識別子、ハイフン区切り、小文字
aliases:
  - short-name         # slug と同じ
  - alternative        # 英語の別名
  - 日本語キーワード     # 日本語の別名
  - 別の日本語キーワード
---
```

詳細は `docs/training/README.md` を参照すること。

## 注意事項

- **モジュール独立性**: 各手順ファイルは他のファイルへの言及を含めないこと（完全に自己完結させる）
- **slug の衝突**: 新規追加時は既存の slug / aliases と重複しないことを確認
- **存在しないファイル**: `code` コマンドでエラーが出た場合は候補を再提示する
