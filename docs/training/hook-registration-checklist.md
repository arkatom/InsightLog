# Hook 登録時のチェックリスト

Part 6 slide 25「Hook の設定と入出力」で settings.json に Hook を登録する際、受講者が JSON フォーマットエラー / 実行権限漏れ / matcher のタイポでハマるのを防ぐためのチェックリスト。

---

## Step 1: settings.json の現状確認

```bash
cat ~/.claude/settings.json | jq .
```

`jq .` でエラーが出る場合 → 既に JSON が壊れている。バックアップを取ってから編集する。

```bash
cp ~/.claude/settings.json ~/.claude/settings.json.bak.$(date +%Y%m%d-%H%M)
```

既存の `"hooks"` キーがある場合は、その配列の **末尾に追加** する。新規キー作成は二重定義になり、後勝ちで先のエントリが無視される。

---

## Step 2: JSON フォーマット検証

### カンマの有無

JSON は **末尾カンマ禁止** (JSON5 ではない)。配列 / オブジェクトの最後の要素には **カンマを付けない**。

| 位置 | カンマ |
|------|--------|
| 配列の最初の要素の後 | ✅ あり |
| 配列の途中の要素の後 | ✅ あり |
| 配列の最後の要素の後 | ❌ なし |

### ダブルクォート

全プロパティ名 / 文字列値はダブルクォート必須。シングルクォート不可。

```jsonc
// ❌ NG
{
  'matcher': 'Bash',
  "hooks": [...]
}

// ✅ OK
{
  "matcher": "Bash",
  "hooks": [...]
}
```

### 検証コマンド

```bash
# JSON 解析できるか
jq . ~/.claude/settings.json

# 解析エラーなら、jq が「parse error: ...」を返す
```

---

## Step 3: matcher 文字列の検証

`matcher` は **正規表現または完全一致文字列**。

| 例 | 意味 |
|----|------|
| `"matcher": "Bash"` | Bash ツール全般を対象 (tool_name へのフィルタ) |
| `"matcher": "Bash"` + `"if": "Bash(git commit *)"` | Bash ツールのうち `git commit` 系コマンドのみ (`if` フィールドは permission rule 構文で絞り込み) |
| `"matcher": "mcp__playwright__browser_take_screenshot"` | Playwright スクリーンショットツールに完全一致 |
| `"matcher": "Edit\|Write"` | Edit ツール または Write ツール (Markdown table のため表記上 `\|` だが JSON では `|` 単体で OR) |

**重要**: `matcher` は `tool_name` に対するフィルタ。`"Bash(git commit:*)"` のような permission rule 構文を `matcher` に直接書いても tool_name に一致せず Hook は発火しない。コマンド単位で絞り込むには `matcher: "Bash"` + 別フィールド `if: "Bash(git commit *)"` の組み合わせが正しい。

### よくあるタイポ

- ❌ `"Bsh"` (`a` 抜け)
- ❌ `"bash"` (大文字小文字違い)
- ❌ `"matcher": "Bash(git commit:*)"` (permission rule 構文を matcher に直接書いている。matcher は tool_name へのフィルタなので Bash にも一致しない → Hook が永遠に発火しない)
- ❌ `"matcher": Bash` (引用符なし)

### 検証

```bash
# 設定中の matcher 一覧
jq -r '.hooks[].matcher' ~/.claude/settings.json
```

---

## Step 4: command スクリプトの検証

### 実行権限

シェルスクリプトを呼ぶ場合、**実行権限が必須**:

```bash
chmod +x .claude/hooks/your-hook.sh
ls -la .claude/hooks/your-hook.sh
# 出力例: -rwxr-xr-x  1 user staff 1234 ...
```

### shebang

スクリプト先頭に `#!/bin/bash` または `#!/usr/bin/env bash` が必要。

```bash
head -1 .claude/hooks/your-hook.sh
# 出力: #!/bin/bash
```

### 単体動作確認

スクリプトを単体で実行してエラーが出ないか確認:

```bash
bash .claude/hooks/your-hook.sh < /dev/null
echo "exit code: $?"
```

`exit code: 0` で終了することが必須 (Hook は exit 0 推奨。詳細は `apps/InsightLog/.claude/hooks/observe-check-commit.sh` の冒頭コメント参照)。

---

## Step 5: Hook event の選択

主要 5 イベントの使い分け:

| Event | タイミング | decision control | 用途 |
|-------|-----------|------------------|------|
| PreToolUse | ツール実行前 | block / approve / context 注入 | 実行前ガード |
| PostToolUse | ツール実行後 | context 注入 (block 不可) | 副作用 (ログ・通知) |
| UserPromptSubmit | ユーザー prompt 送信時 | additionalContext | プロンプト前置注入 |
| SessionStart | セッション開始時 | additionalContext のみ | 起動時通知・初期コンテキスト |
| Stop | AI 応答完了時 | additionalContext | 完了通知 |

**注意**: `decision control` フィールドは event ごとに異なる。`block` / `approve` を使えるのは PreToolUse のみ。`additionalContext` は全 event で使えるが、PostToolUse / SessionStart は **これしか使えない**。

公式仕様: `docs/official_docs/cc/hooks.md` を参照。

---

## Step 6: Claude Code 再起動

settings.json 変更後は **Claude Code セッションを再起動** (新セッションで反映される)。

```bash
# 既存セッションを終了 → 新規セッション起動
exit  # または Ctrl+D
claude
```

`/hooks` コマンドで現在のセッションが認識している Hook 一覧を確認できる:

```
/hooks
```

ここに自分が登録した Hook が出てくれば反映成功。

---

## よくある失敗例トップ 5

| 失敗 | 症状 | 修正 |
|------|------|------|
| 1. JSON 末尾カンマ | `jq: parse error: Expected another array element` | 末尾カンマを削除 |
| 2. シングルクォート | `jq: parse error: Invalid string` | ダブルクォートに修正 |
| 3. シェルスクリプト実行権限なし | Hook が呼ばれても何も起きない | `chmod +x` |
| 4. matcher のタイポ | Hook が永遠に発火しない | 正規表現を確認 (`Bash` の大文字 / コマンド名のスペル) |
| 5. Hook 登録後 Claude Code 再起動忘れ | 設定変更が反映されない | `exit` → `claude` で再起動 |

---

## 実例: observe-check-commit.sh の登録 (リファレンス、実装は実習⑦ で行う)

`apps/InsightLog/.claude/hooks/observe-check-commit.sh` 冒頭コメント L47-65 に記載されている公式準拠の登録例:

```jsonc
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "if": "Bash(git commit *)",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/observe-check-commit.sh"
          }
        ]
      }
    ]
  }
}
```

ポイント:
- `matcher: "Bash"` で tool_name フィルタ (Bash ツール全般を対象)
- `if: "Bash(git commit *)"` で permission rule 構文を使い `git commit` 系コマンドのみに絞る
- `command: bash .claude/hooks/observe-check-commit.sh` でスクリプトを実行

**注意**: 上記は **リファレンス例** であり、`apps/InsightLog/.claude/settings.json` には実際には未登録 (実習⑦ で受講者が手動登録する想定)。settings.json には現在 `mcp__playwright__browser_take_screenshot` matcher の `open-screenshot.sh` のみ登録されている。

スクリプト本体: `apps/InsightLog/.claude/hooks/observe-check-commit.sh`
冒頭 1-67 行のコメントに「なぜ PreToolUse じゃなく PostToolUse か」「なぜ exit 0 固定か」「なぜ JSON additionalContext を返すか」「`matcher` + `if` の使い分け」が公式 URL 引用付きで解説されている。

---

## 講師ノート（Part 6 slide 25 で活用する想定）

- このファイルを VS Code で開いて、**Step 1 の `jq .` 確認** から見せる
- 受講者が settings.json を編集する直前に「これだけは確認」として Step 2 (カンマ + ダブルクォート) を強調
- Step 6 の「Claude Code 再起動忘れ」が最も多発する失敗。明示的に何度も繰り返す
- 30 分のハンズオンで Step 1-6 を順に踏めば、JSON フォーマットエラーは 95% 防げる
