---
type: jisshu
title: AI に「してはいけないこと」を設定する（3層防御）
slug: multi-layer-guard
aliases:
  - multi-layer-guard
  - guard
  - permission
  - 多層防御
  - ブレーキ
  - セキュリティ
  - 禁止設定
  - deny
  - hook-security
---

# 実習: AI に「してはいけないこと」を設定する（3層防御）

## ゴール

Claude Code に「やってはいけないこと」を 3 つの層で設定する。AI は強力な道具だからこそ、**ブレーキを意識的に設計する** 体験をする。

> **用語メモ**
> - `Permission`（パーミッション）= Claude Code が実行を「許可 / 拒否 / 要確認」するルール一覧。会社の「就業規則」に相当
> - `Hook`（フック）= 特定のイベント発生時に自動実行されるスクリプト
> - `PreToolUse`（プリ ツール ユーズ）= ツール実行の直前に発火するイベント
> - `settings.json`（セッティングス ジェイソン）= Claude Code の設定ファイル

## 前提

- Claude Code が起動していること
- InsightLog のディレクトリで作業していること

---

## Phase 1: 禁止ルールを設定する（12分）

**何をするか**: 「rm -rf（全削除）」「git push --force（強制上書き）」「curl（外部通信）」をデフォルトで禁止し、一部は実行前に確認を求めるよう設定する。

Claude Code の入力欄に以下をコピペして実行してください:

```
.claude/settings.json の permissions に、以下を追加してください。

deny（拒否）:
- Bash(curl *)        … 外部への通信リクエスト全般
- Bash(rm -rf *)      … ディレクトリごと削除するコマンド
- Bash(git push --force *)  … 強制的な上書きプッシュ

ask（実行前に確認）:
- Bash(rm *)          … ファイル削除コマンド
- Bash(git push *)    … 通常のプッシュ

制約: 既存の permissions.allow は絶対に触らない。
JSON の構文を最後に jq で検証してください。
```

> **用語メモ**: `deny`（デナイ）= 拒否。`ask`（アスク）= 確認。`allow`（アロウ）= 許可。`jq`（ジェイキュー）= JSON の形式チェックツール

**動作確認** — 以下を Claude Code に入力して試す:

```
curl https://example.com を実行してください
```

問答無用でブロックされれば成功です。

---

## Phase 2: 機密情報を検出する Hook を作る（18分）

**何をするか**: API キーやパスワードらしき文字列をコードに書き込もうとしたとき、Claude Code が自動で止める仕組みを作る。

Claude Code の入力欄に以下をコピペして実行してください:

```
.claude/hooks/secret-detector.sh を新規作成してください。

役割: ツール実行の直前（PreToolUse）に機密情報らしき文字列を検出してブロックする。

対象ツール: Bash / Write / Edit のみ（他のツールはスルー）

検出対象（以下のいずれかが含まれる場合にブロック）:
- sk- で始まる文字列（OpenAI API キー）
- ghp_ で始まる文字列（GitHub トークン）
- AKIA で始まる文字列（AWS アクセスキー）
- .env という文字列を含むパス
- password / secret / token という単語の隣に 32 文字以上の英数字

ブロック時の出力（このJSON形式で標準出力に出力）:
{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "機密情報を検出しました。内容を確認してください。"}}

ブロックしない場合も exit 0 で正常終了してください。
作成後に .claude/settings.json へ Hook として登録し、chmod +x まで実行してください。
```

> **用語メモ**
> - `exit 0`（イグジット ゼロ）= スクリプトの正常終了。エラーなし
> - `chmod +x`（チェンジモード プラス エックス）= ファイルに実行権限を付与するコマンド
> - `stdout`（スタンダードアウト）= 標準出力。スクリプトが外に結果を返す通り道

**動作確認** — 以下を Claude Code に入力してブロックされるか確認:

```
OPENAI_API_KEY=sk-FAKE-FOR-TEST-12345 という行を .env に追記してください
```

> ⚠️ **重要**: テスト用の文字列は必ず「FAKE-FOR-TEST」などのダミーを使ってください。本物のキーは絶対に入力しないこと

deny が返り、停止理由が表示されれば成功です。

---

## Phase 3: InsightLog に記録する（5分）

[InsightLog](https://insightlog.pages.dev/) に以下を記録してください:

| 項目 | 何を書くか |
|------|-----------|
| タスク名 | AI へのブレーキ設定（3層防御） |
| AIツール | Claude |
| 所要時間 | 実測値 |
| AI 未利用時の推定 | 自力で設定・スクリプトを書いたら何分かかるか |
| 手戻り回数 | 指示のやり直し回数 |
| カテゴリ | 設計 |
| 振り返りメモ | **特に大事**: Phase 1・2 のうち、どちらの「ブレーキ」がより重要だと感じたか。理由も |

---

## 完成の定義

- [ ] Phase 1: permission の deny / ask が設定され、curl がブロックされることを確認した
- [ ] Phase 2: secret-detector.sh が作られ、ダミーの API キーがブロックされることを確認した
- [ ] Phase 3: InsightLog に振り返りメモまで書いて記録した

---

## 詰まったら

- **curl がブロックされない**:
  1. `cat .claude/settings.json | jq .permissions.deny` で deny に追加されているか確認
  2. JSON の構文エラーの可能性 → `cat .claude/settings.json | jq .` でエラーが出るか確認
  3. Claude Code の再起動が必要な場合がある

- **secret-detector.sh が作られたがブロックしない**:
  1. `ls -la .claude/hooks/` で実行権限（`x`）がついているか確認
  2. `cat .claude/settings.json | jq .hooks` で Hook が登録されているか確認
  3. 対象ツール（`matcher`）が `Bash|Write|Edit` になっているか確認

- **JSON の構文エラーが出た**: `cat .claude/settings.json` の内容をコピペして Claude Code に「JSON のエラーを修正してください」と伝える

- **時間内に終わらない**: Phase 1（permission 設定）まで完了すれば十分。Phase 2 は時間があれば
