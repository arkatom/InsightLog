---
type: handson
title: CLAUDE.md の有無で AI の回答がどう変わるか比較
slug: compare
aliases:
  - compare
  - claudemd
  - claude比較
  - マニュアル比較
  - クロードmd
---

# ハンズオン: CLAUDE.md の有無で比較

## ゴール

`CLAUDE.md` を一時的に隠した状態と、戻した状態で **まったく同じ質問** を投げて、AI の回答がどう変わるかを体感する。

## 前提

- InsightLog プロジェクトで Claude Code が起動できる状態
- プロジェクトルートに `CLAUDE.md` が存在することを確認

    ```bash
    ls CLAUDE.md
    ```

## Phase 1 — CLAUDE.md を隠して質問する

1. ターミナルで CLAUDE.md をリネーム

    ```bash
    mv CLAUDE.md CLAUDE.md.bak
    ```

2. Claude Code を再起動（`claude` コマンドを再実行）

3. 以下の質問をそのままコピペして投げる

    ```
    InsightLog で新しい UI コンポーネントを追加したいです。
    どこに置いて、どういうルールで書けばいいですか？
    既存のものに合わせる必要はありますか？
    ```

4. 回答をよく読む

5. 追加でもう一問

    ```
    その回答のために、どのファイルを読みましたか？
    ```

6. **回答をメモ or スクショ**（Phase 3 で比較するため）

## Phase 2 — CLAUDE.md を戻して同じ質問

1. CLAUDE.md を復元

    ```bash
    mv CLAUDE.md.bak CLAUDE.md
    ```

2. Claude Code を再起動

3. Phase 1 と **まったく同じ2つの質問** を投げる

4. 回答をメモ or スクショ

## Phase 3 — 2つの回答を並べて比較

以下の観点で並べて見てください。

| 観点 | CLAUDE.md なし | CLAUDE.md あり |
|------|----------------|----------------|
| 配置場所 | どう答えた？ | どう答えた？ |
| 命名規則 | どう答えた？ | どう答えた？ |
| コンポーネント形式 | どう答えた？ | どう答えた？ |
| 状態管理の方針 | どう答えた？ | どう答えた？ |
| 情報源 | 何を読んだ？ | 何を読んだ？ |

### 気づきポイント

- CLAUDE.md がないと、AI は何を根拠に回答しているか
- CLAUDE.md があると、答えの具体度・確信度がどう変わったか
- AI は「明文化されたルール」と「推測」をどう扱い分けているか

## トラブルシューティング

- **CLAUDE.md.bak が残ってしまった**: `mv CLAUDE.md.bak CLAUDE.md` で戻す
- **Claude Code の再起動方法がわからない**: 一度 Ctrl+C または `/exit` でセッション終了 → ターミナルで `claude` を再実行
- **質問を変えたくなった**: Phase 1 と Phase 2 は **同じ質問** であることが比較の前提。変えると効果が見えにくい
