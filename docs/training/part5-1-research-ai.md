---
type: jisshu
title: 既存スキルに新機能を1つ追加する
slug: research-ai
aliases:
  - research-ai
  - research
  - skill
  - スキル
  - 部下を伸ばす
  - リサーチ
---

# 実習: 既存スキルに新機能を1つ追加する

## ゴール

既存の `/research-ai` スキルを読んで構造を把握し、そこに **Zenn の人気 AI 記事を取得する機能を 1 つ追加**する。SKILL.md 本体の設計を変えずにサブファイルを 1 枚足すだけで機能が拡張できる体験（段階的開示）をする。

> **用語メモ**
> - `Skill`（スキル）= Claude Code の `/スキル名` で呼び出せる命令ファイル群。`.claude/skills/{スキル名}/` ディレクトリに配置する
> - `段階的開示`（だんかいてき かいじ）= SKILL.md はシンプルな入口だけ書き、詳細は references/ や scripts/ に分散させる設計。見通しが良くなり、後から機能を足しやすい
> - `scripts/`（スクリプツ）= スキルが内部で使う補助シェルスクリプト群を置くディレクトリ

## 前提

- Claude Code が起動していること
- InsightLog のディレクトリで作業していること

---

## Phase 1: 既存 Skill の構成を読む（5分）

**何をするか**: 改造する前に現状を把握する。`.claude/skills/research-ai/` の中身を開いて、どのファイルが何の役割を持つかを確認する。

Claude Code の入力欄に以下を入力してください:

```
.claude/skills/research-ai/ を開いて、SKILL.md と references/feeds.md の中身を順番に読んでください。それぞれが何の役割を持つか 2-3 行で教えてください。
```

ファイル構成:

| ファイル | 役割 |
|---------|------|
| `SKILL.md` | スキルの入口。呼び出し時の手順・出力フォーマット・allowed-tools が書かれている |
| `references/feeds.md` | RSS フィードの URL 一覧（情報源の設定） |
| `references/article-item-template.md` | 記事 1 件を表示するテンプレート |
| `references/sample-summary.md` | `/research-ai` の出力例 |

> **確認ポイント**: `scripts/` ディレクトリがないことに注目。実習でここに 1 ファイルを新設する。

---

## Phase 2: Zenn 取得機能を追加する（20分）

**何をするか**: スライドのコピペプロンプトをそのまま Claude Code に投げて、3 点セットを実装させる。

Claude Code の入力欄に以下を **そのままコピペ** して実行してください:

```
.claude/skills/research-ai/ を Zenn 対応に拡張してください。

まず SKILL.md と references/feeds.md を読んで現状構成を確認してから、以下 3 点セットで実装します。

① scripts/zenn_recent.sh を新設（Zenn API（公開、無認証） / Topic「AI」× 直近 7 日 × liked_count 50 以上を取得）
② SKILL.md の手順に Zenn 取得ステップを追加し、出力フォーマットにも Zenn セクションを加える
③ allowed-tools に Bash 実行権限を追加

ゴール：/research-ai を叩くと Claude Code の changelog と Zenn 人気記事が同じ Markdown サマリーに並んで返る状態。
実装前に設計案（3 点セット各ファイルの内容概要）を 1 度見せてください。実装後は /research-ai を叩いて動作確認します。
```

**チェックポイント（Claude が設計案を出してきたとき）**:
- `scripts/zenn_recent.sh` の内容概要が含まれているか
- SKILL.md 本体への追加内容が説明されているか
- `allowed-tools` に Bash が追加されるか

問題なければ **そのまま進める** と伝えて実装させる。

---

## Phase 3: `/research-ai` を実行して動作確認する（5分）

実装が終わったら Claude Code の入力欄で以下を実行:

```
/research-ai
```

**確認ポイント**:
- Zenn の人気記事が Claude Code changelog と同じサマリーに含まれているか
- エラーが出ていないか

うまく動かない場合は Claude Code に「結果を確認して、エラーがあれば直してください」と伝える。

---

## Phase 4: InsightLog に記録する（5分）

[InsightLog](https://insightlog.pages.dev/) に以下を記録してください:

| 項目 | 何を書くか |
|------|-----------|
| タスク名 | research-ai スキルに Zenn 機能を追加 |
| AIツール | Claude |
| 所要時間 | 実測値 |
| AI 未利用時の推定 | Zenn API 調査 + スクリプト作成を自力でやったら何分かかるか |
| 手戻り回数 | 指示のやり直し回数 |
| カテゴリ | 設計 |
| 振り返りメモ | **特に大事**: 設計案を見てから承認する体験で何に気づいたか。SKILL.md を直接触らずに機能を増やせた感触を書く |

---

## 完成の定義

- [ ] Phase 1: SKILL.md と references/feeds.md の役割を把握した
- [ ] Phase 2: 3 点セット（zenn_recent.sh / SKILL.md 更新 / allowed-tools 追加）が実装された
- [ ] Phase 3: `/research-ai` を実行して Zenn の記事が結果に含まれることを確認した
- [ ] Phase 4: InsightLog に振り返りメモまで書いて記録した

---

## 詰まったら

- **`/research-ai` でエラーが出る**: Claude Code に「/research-ai を実行するとエラーが出ます。原因を調べて直してください」と伝える

- **Zenn の記事が出てこない**: Claude Code に「Zenn API からデータが取れているか確認して、scripts/zenn_recent.sh の動作をデバッグしてください」と伝える

- **設計案が長くて読み解けない**: 「SKILL.md への追加内容だけ先に確認したい」と絞って確認する

- **時間内に終わらない**: Phase 2 のプロンプト投入＋設計案承認まで体験できれば十分。Phase 3 の動作確認は時間があれば
