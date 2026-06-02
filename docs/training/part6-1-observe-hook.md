---
type: jisshu
title: commit したら AI が振り返りを促す仕組みを作る
slug: observe-hook
aliases:
  - observe-hook
  - hook
  - 振り返りhook
  - 改善サイクル
  - commit-hook
  - コミットフック
  - 自動振り返り
---

# 実習: commit したら AI が振り返りを促す仕組みを作る

## ゴール

Claude Code に「git commit が完了したら、一定時間が経っていれば /observe を実行してください」と自動的に伝える仕組みを、自然言語で指示して作ってもらう。

AI に **仕組みそのものを設計・実装させる** 体験。

> **用語メモ**
> - `Hook`（フック）= 特定のイベントが発生したときに自動で動くスクリプト。スマホの「着信通知」と同じ発想
> - `/observe`（オブザーブ）= セッション（作業記録）を振り返り、改善点を記録するコマンド
> - `git commit`（ギット コミット）= コードの変更を保存・確定する操作
> - `low risk / high risk` = 変更の影響範囲。低リスクは自動適用、高リスクは人間が判断

## 前提

- Claude Code が起動していること
- InsightLog のディレクトリで作業していること（Codespace を開いたらここにいるはず）

---

## Phase 1: 仕組みを作る（20分）

Claude Code の入力欄に以下をコピペして実行してください:

```
git commit が完了したタイミングで、前回の /observe 実行から 1 時間ほど空いていたら
「/observe を実行してください。observe は内部で /evolve も連続実行します
（low risk は自動適用、high risk は人間判断キューに）」と Claude にそっと伝える仕組みを
.claude/ 配下に追加してください。コミット自体はブロックしないでください。
既に .claude/hooks/observe-check-commit.sh が存在する場合は中身を確認して
既存の hooks は壊さない差分で。できたら動作テストもお願いします。
```

**何が起きるか**: Claude Code が `.claude/hooks/` 内にスクリプトファイルを作成し、`.claude/settings.json` に Hook の設定を追加します。

> **用語メモ**
> - `.claude/hooks/`（ドット claude スラッシュ hooks）= Claude Code が自動実行するスクリプトの置き場所
> - `.claude/settings.json` = Claude Code の設定ファイル（JSON 形式）
> - `JSON`（ジェイソン）= 設定ファイルによく使われるデータの書き方。波カッコ `{}` で囲む形式

---

## Phase 2: 動作を確認する（10分）

作成が完了したら、空のコミットで動作を確認します:

1. Claude Code の入力欄に以下をコピペ:

    ```
    !git commit --allow-empty -m "test: observe hook 動作確認"
    ```

    > **用語メモ**: `!` を先頭に付けるとコマンドとして直接実行されます。`--allow-empty` は「変更がなくてもコミットを作る」オプションです

2. コミット完了後、Claude Code が「/observe を実行してください」と伝えてくるか確認する

    **うまくいけば**: 「前回の /observe から X 分経っているため、/observe を実行してください」という通知が届きます

3. `/observe` を実行して改善サイクルが動くか確認する

---

## Phase 3: InsightLog に記録する（5分）

[InsightLog](https://insightlog.pages.dev/) に以下を記録してください:

| 項目 | 何を書くか |
|------|-----------|
| タスク名 | commit Hook による振り返り自動化 |
| AIツール | Claude |
| 所要時間 | 実測値 |
| AI 未利用時の推定 | 自力でスクリプトを書いたら何分かかるか |
| 手戻り回数 | 指示のやり直し回数 |
| カテゴリ | その他 |
| 振り返りメモ | **特に大事**: 自然言語で「仕組みを作って」と伝えるだけで実装できたか。何か追加で指示したか |

---

## 完成の定義

- [ ] Phase 1: プロンプトをコピペして Hook が作られた
- [ ] Phase 2: 空コミットで通知が届くことを確認した
- [ ] Phase 3: InsightLog に振り返りメモまで書いて記録した

---

## 詰まったら

- **Hook が動かない / 通知が届かない**:
  1. `cat .claude/settings.json | jq .` を実行して JSON が正しい形式か確認
     （エラーが出たら「settings.json を修正してください」と Claude Code に伝える）
  2. `ls -la .claude/hooks/` でファイルに実行権限（`x`）がついているか確認
     （ついていなければ「chmod +x .claude/hooks/observe-check-commit.sh」を実行）
  3. `.claude/tmp/` ディレクトリが存在するか確認。なければ `mkdir -p .claude/tmp` で作成

- **「observe-check-commit.sh は既に存在します」と言われる**: 既存ファイルを確認してから差分で追記するよう Claude Code に伝える

- **時間内に終わらない**: Phase 1 のプロンプト実行まで完了すれば十分。動作確認は時間があれば
