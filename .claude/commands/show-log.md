---
description: "デモ実行の生JSONログを stream-parser.py で整形表示する。引数でログファイルを指定するか、最新のログを自動選択する。"
---

# ログ表示

`demo/stream-parser.py` を使って、デモ実行の生JSONログを整形表示する。

## 手順

### 1. ログファイルの特定

引数（`$ARGUMENTS`）が指定されている場合:
- そのパスをログファイルとして使用する

引数が指定されていない場合:
- `demo/logs/raw_*.jsonl` から最新のファイルを自動選択する

```bash
# 最新のログファイルを取得
LATEST=$(ls -t demo/logs/raw_*.jsonl 2>/dev/null | head -1)
```

ログファイルが存在しない場合はエラーメッセージを表示して終了する。

### 2. ログ情報の表示

整形表示の前に、ログの概要を表示する:

```bash
# ファイルサイズ
ls -lh <ログファイル>

# イベント数
wc -l < <ログファイル>

# セッション情報（先頭の init イベントから）
head -1 <ログファイル> | python3 -c "
import sys, json
e = json.loads(sys.stdin.read())
if e.get('type') == 'system' and e.get('subtype') == 'init':
    print(f'モデル: {e.get(\"model\", \"?\")}')
    print(f'セッションID: {e.get(\"session_id\", \"?\")[:8]}...')
"
```

### 3. 整形表示

```bash
cat <ログファイル> | python3 demo/stream-parser.py
```

出力は自動的にページャー（less -R）を通さずそのまま表示する。
ターミナルの ANSI カラーがそのまま表示される。

### 4. ファイル出力（オプション）

ユーザーが「ファイルに出力して」と言った場合:
- ANSI エスケープを除去してテキストファイルに保存する

```bash
cat <ログファイル> | python3 demo/stream-parser.py | sed 's/\x1b\[[0-9;]*m//g' > demo/logs/formatted_<タイムスタンプ>.txt
```

### 5. 複数ログがある場合

`demo/logs/` に複数のログがある場合、一覧を表示してユーザーに選択を促す:

```bash
ls -lht demo/logs/raw_*.jsonl
```

表示例:
```
利用可能なログ:
  1. raw_20260322_020746.jsonl (680KB, 392 events)
  2. raw_20260321_143000.jsonl (520KB, 298 events)

番号を選択するか、パスを指定してください。
```
