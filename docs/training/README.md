# 研修の実習・ハンズオン手順

このディレクトリには研修で使う実習・ハンズオンの手順書が Markdown で置いてあります。

Claude Code から `/training` スキルで呼び出せます。

## 使い方

```bash
/training              # 全件一覧
/training handson      # ハンズオンのみ一覧
/training jisshu       # 実習のみ一覧
/training <keyword>    # キーワードで検索して開く
```

キーワードは英語スラッグ（`compare`・`research-ai` 等）でも日本語（`3層防御`・`スキル` 等）でも受理します。

## ファイル命名規則

- **ファイル名**: 短い英単語ベース（名詞または動詞）、ハイフン区切り、小文字。連番は使わない
- **front-matter 必須項目**: `type` / `title` / `slug` / `aliases`
- **他ファイルへの言及禁止**: 各手順は完全に自己完結させる（他の実習・ハンズオンに触れない）

### front-matter のテンプレート

```yaml
---
type: jisshu          # jisshu | handson
title: 日本語の正式タイトル
slug: short-name
aliases:
  - short-name
  - alternative
  - 日本語キーワード
  - 別の日本語
---
```

### 新規追加時のチェックリスト

- [ ] `slug` が他ファイルと衝突しない
- [ ] `aliases` に英語と日本語を合計3〜5個
- [ ] 他の手順ファイルへの言及がない
- [ ] 受講生が単独で読んで手順通りに動かせる
