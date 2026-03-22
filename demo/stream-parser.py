#!/usr/bin/env python3
"""
Claude Code stream-json パーサー — 研修デモ用リアルタイムログ整形

stdin から stream-json (NDJSON) を読み取り、
Claude Code の対話風にすべてのイベントを整形表示する。

表示内容:
  - セッション初期化（モデル・ツール・MCP サーバー）
  - 思考（thinking）— 全文表示
  - ツール呼び出し（tool_use）— ツール名・パラメータ全文
  - ツール結果（tool_result）— 出力全文
  - サブエージェント起動・進捗・完了
  - テキスト応答 — 全文表示
  - コスト・トークン使用量

使い方:
  # リアルタイム（run.sh から）
  claude -p "..." --output-format stream-json --verbose \
    | python3 demo/stream-parser.py [--raw-log demo/logs/raw.jsonl]

  # ログ再生
  cat demo/logs/raw_YYYYMMDD_HHMMSS.jsonl | python3 demo/stream-parser.py
"""

import json
import sys
import argparse
import textwrap
from datetime import datetime

# ── ANSI カラー ──────────────────────────────────────────────────────────
RESET = '\033[0m'
BOLD = '\033[1m'
DIM = '\033[2m'
ITALIC = '\033[3m'
RED = '\033[31m'
GREEN = '\033[32m'
YELLOW = '\033[33m'
BLUE = '\033[34m'
MAGENTA = '\033[35m'
CYAN = '\033[36m'
WHITE = '\033[37m'
BG_BLUE = '\033[44m'
BG_GREEN = '\033[42m'
BG_MAGENTA = '\033[45m'
BG_CYAN = '\033[46m'

WIDTH = 100


def ts():
    return datetime.now().strftime('%H:%M:%S')


def fmt_duration(ms):
    if ms < 1000:
        return f'{ms}ms'
    s = ms / 1000
    if s < 60:
        return f'{s:.1f}s'
    m = int(s // 60)
    s = s % 60
    return f'{m}m{s:.0f}s'


def header(icon, title, color=CYAN):
    print(f'\n{DIM}[{ts()}]{RESET} {icon} {color}{BOLD}{title}{RESET}')


def separator(char='─'):
    print(f'{DIM}{char * WIDTH}{RESET}')


def thin_separator():
    print(f'{DIM}{"·" * WIDTH}{RESET}')


def indent_text(text, prefix='  │ ', color=DIM):
    """テキストをインデント付きで表示（全文）"""
    for line in text.split('\n'):
        print(f'{color}{prefix}{RESET}{line}')


def short_path(path):
    """ワークツリーの長いパスを短縮"""
    markers = ['/worktrees/demo-run/', '/InsightLog/']
    for m in markers:
        idx = path.find(m)
        if idx >= 0:
            return path[idx + len(m):]
    return path


# ── フェーズ追跡 ─────────────────────────────────────────────────────────
# task_progress から現在のフェーズを推定する
PHASE_MAP = {
    'plan': '📋 計画策定',
    'implement': '🔨 実装',
    'unit-test': '🧪 ユニットテスト',
    'e2e-plan': '📝 E2E設計',
    'e2e-run': '🎬 E2E実行',
    'commit': '💾 コミット',
    'pr': '📤 PR作成',
    'review': '🔍 レビュー',
}


class State:
    """パーサーの状態管理"""
    def __init__(self):
        self.current_phase = None
        self.agent_task_ids = {}  # task_id -> agent info
        self.tool_use_map = {}    # tool_use_id -> tool info
        self.event_count = 0
        self.total_cost = 0


state = State()


def show_init(event):
    """セッション初期化"""
    session_id = event.get('session_id', '???')
    model = event.get('model', '???')
    cwd = event.get('cwd', '???')
    tools = event.get('tools', [])
    mcp = event.get('mcp_servers', [])
    mode = event.get('permissionMode', '???')

    print(f'{BOLD}{BG_BLUE}{WHITE} 🔍 Claude Code セッションログ {RESET}')
    print()
    print(f'  {BOLD}セッションID:{RESET} {session_id}')
    print(f'  {BOLD}モデル:{RESET}       {model}')
    print(f'  {BOLD}作業ディレクトリ:{RESET} {short_path(cwd)}')
    print(f'  {BOLD}権限モード:{RESET}   {mode}')
    print(f'  {BOLD}ツール:{RESET}       {len(tools)}個')
    if mcp:
        connected = [s['name'] for s in mcp if s.get('status') == 'connected']
        if connected:
            print(f'  {BOLD}MCP:{RESET}         {", ".join(connected)}')
    separator('═')


def show_thinking(text):
    """思考内容を全文表示"""
    header('💭', '思考', MAGENTA)
    separator('·')
    indent_text(text, prefix='  │ ', color=DIM)
    separator('·')


def show_tool_use(name, tool_input, tool_use_id=''):
    """ツール呼び出しを詳細表示"""
    # Agent ツールは特別扱い
    if name == 'Agent' or name == 'Task':
        show_agent_spawn(tool_input, tool_use_id)
        return

    header('🔧', f'Tool: {name}', YELLOW)

    if name in ('Read', 'Write'):
        fp = tool_input.get('file_path', '')
        print(f'  {BOLD}ファイル:{RESET} {short_path(fp)}')
        if name == 'Write':
            content = tool_input.get('content', '')
            if content:
                lines = content.split('\n')
                print(f'  {BOLD}内容:{RESET} ({len(lines)}行)')
                # 先頭20行 + 省略
                for line in lines[:20]:
                    print(f'  {DIM}│{RESET} {line}')
                if len(lines) > 20:
                    print(f'  {DIM}│ ... ({len(lines) - 20}行省略){RESET}')
        if 'offset' in tool_input:
            print(f'  {DIM}offset={tool_input["offset"]}, limit={tool_input.get("limit","")}{RESET}')

    elif name == 'Edit':
        fp = tool_input.get('file_path', '')
        print(f'  {BOLD}ファイル:{RESET} {short_path(fp)}')
        old = tool_input.get('old_string', '')
        new = tool_input.get('new_string', '')
        if old:
            print(f'  {RED}━ 削除:{RESET}')
            for line in old.split('\n')[:10]:
                print(f'  {RED}  - {line}{RESET}')
            if old.count('\n') > 10:
                print(f'  {RED}  ... ({old.count(chr(10)) - 10}行省略){RESET}')
        if new:
            print(f'  {GREEN}━ 追加:{RESET}')
            for line in new.split('\n')[:10]:
                print(f'  {GREEN}  + {line}{RESET}')
            if new.count('\n') > 10:
                print(f'  {GREEN}  ... ({new.count(chr(10)) - 10}行省略){RESET}')

    elif name == 'Bash':
        cmd = tool_input.get('command', '')
        desc = tool_input.get('description', '')
        if desc:
            print(f'  {DIM}{desc}{RESET}')
        print(f'  {BOLD}${RESET} {cmd}')

    elif name == 'Grep':
        pattern = tool_input.get('pattern', '')
        path = tool_input.get('path', '.')
        glob_filter = tool_input.get('glob', '')
        print(f'  {BOLD}パターン:{RESET} /{pattern}/')
        print(f'  {BOLD}検索先:{RESET}   {short_path(path)}')
        if glob_filter:
            print(f'  {BOLD}フィルタ:{RESET} {glob_filter}')

    elif name == 'Glob':
        pattern = tool_input.get('pattern', '')
        path = tool_input.get('path', '')
        print(f'  {BOLD}パターン:{RESET} {pattern}')
        if path:
            print(f'  {BOLD}検索先:{RESET} {short_path(path)}')

    elif name == 'Skill':
        skill = tool_input.get('skill', '')
        args = tool_input.get('args', '')
        print(f'  {BOLD}スキル:{RESET} /{skill} {args}')

    elif name.startswith('mcp__'):
        # MCP ツール
        parts = name.split('__')
        server = parts[1] if len(parts) > 1 else '?'
        action = parts[2] if len(parts) > 2 else '?'
        print(f'  {BOLD}MCP:{RESET} {server} → {action}')
        for k, v in tool_input.items():
            val = str(v)[:200]
            print(f'  {BOLD}{k}:{RESET} {val}')

    else:
        # その他のツール — パラメータをそのまま表示
        for k, v in tool_input.items():
            val = str(v)
            if len(val) > 200:
                val = val[:200] + '…'
            print(f'  {BOLD}{k}:{RESET} {val}')

    # tool_use_id を記録
    if tool_use_id:
        state.tool_use_map[tool_use_id] = name


def show_tool_result(content, tool_use_id='', is_error=False):
    """ツール結果を全文表示"""
    tool_name = state.tool_use_map.get(tool_use_id, 'tool')
    color = RED if is_error else GREEN
    icon = '✗' if is_error else '✓'
    label = 'エラー' if is_error else '結果'

    print(f'  {color}{icon} {tool_name} {label}{RESET}')

    text = ''
    if isinstance(content, str):
        text = content
    elif isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get('type') == 'text':
                parts.append(block.get('text', ''))
        text = '\n'.join(parts)

    if text:
        lines = text.split('\n')
        # 全行表示（ただし100行超はtail表示）
        if len(lines) <= 100:
            for line in lines:
                print(f'  {DIM}│{RESET} {line}')
        else:
            for line in lines[:30]:
                print(f'  {DIM}│{RESET} {line}')
            print(f'  {DIM}│ ... ({len(lines) - 50}行省略) ...{RESET}')
            for line in lines[-20:]:
                print(f'  {DIM}│{RESET} {line}')


def show_agent_spawn(tool_input, tool_use_id=''):
    """サブエージェント起動"""
    agent_type = tool_input.get('subagent_type', tool_input.get('name', 'agent'))
    desc = tool_input.get('description', '')
    prompt = tool_input.get('prompt', '')
    model = tool_input.get('model', '')

    print()
    separator('━')
    print(f'{DIM}[{ts()}]{RESET} 🚀 {BG_CYAN}{BOLD}{WHITE} Agent: {agent_type} {RESET}  {desc}')
    if model:
        print(f'  {DIM}モデル: {model}{RESET}')
    if prompt:
        print(f'  {BOLD}プロンプト:{RESET}')
        lines = prompt.strip().split('\n')
        for line in lines[:30]:
            print(f'  {DIM}│{RESET} {line}')
        if len(lines) > 30:
            print(f'  {DIM}│ ... ({len(lines) - 30}行省略){RESET}')
    separator('━')

    if tool_use_id:
        state.tool_use_map[tool_use_id] = f'Agent({agent_type})'


def show_task_started(event):
    """サブタスク（サブエージェント）開始"""
    task_id = event.get('task_id', '')
    desc = event.get('description', '')
    task_type = event.get('task_type', '')
    prompt = event.get('prompt', '')

    print()
    separator('━')
    print(f'{DIM}[{ts()}]{RESET} 🚀 {BG_CYAN}{BOLD}{WHITE} Sub-agent: {desc} {RESET}')
    print(f'  {DIM}タスクID: {task_id}  タイプ: {task_type}{RESET}')
    if prompt:
        print(f'  {BOLD}プロンプト:{RESET}')
        lines = prompt.strip().split('\n')
        for line in lines:
            print(f'  {DIM}│{RESET} {line}')
    separator('━')

    state.agent_task_ids[task_id] = {'description': desc, 'start_ms': 0}


def show_task_progress(event):
    """サブエージェントの進捗（ツール呼び出し1件ごと）"""
    task_id = event.get('task_id', '')
    desc = event.get('description', '')
    tool_name = event.get('last_tool_name', '')
    usage = event.get('usage', {})
    dur_ms = usage.get('duration_ms', 0)
    total_tokens = usage.get('total_tokens', 0)
    tool_uses = usage.get('tool_uses', 0)

    agent_info = state.agent_task_ids.get(task_id, {})
    agent_name = agent_info.get('description', 'sub-agent')

    # フェーズ推定
    desc_lower = desc.lower()
    for phase_key, phase_label in PHASE_MAP.items():
        if phase_key in desc_lower:
            if state.current_phase != phase_key:
                state.current_phase = phase_key
                print()
                print(f'  {BOLD}{phase_label}{RESET}')

    # ツール呼び出し1行表示
    icon_map = {
        'Read': '📖',
        'Write': '✏️',
        'Edit': '✏️',
        'Bash': '💻',
        'Grep': '🔍',
        'Glob': '📂',
        'Agent': '🚀',
        'Task': '🚀',
    }
    icon = icon_map.get(tool_name, '🔧')

    print(f'  {DIM}[{fmt_duration(dur_ms):>7}]{RESET} {icon} {YELLOW}{tool_name:>8}{RESET}  {desc}  {DIM}({total_tokens:,}tok / {tool_uses}calls){RESET}')


def show_task_notification(event):
    """サブエージェント完了"""
    task_id = event.get('task_id', '')
    status = event.get('status', '')
    summary = event.get('summary', '')
    usage = event.get('usage', {})
    dur_ms = usage.get('duration_ms', 0)
    total_tokens = usage.get('total_tokens', 0)
    tool_uses = usage.get('tool_uses', 0)

    agent_info = state.agent_task_ids.get(task_id, {})
    agent_name = agent_info.get('description', summary)

    color = GREEN if status == 'completed' else RED
    icon = '✅' if status == 'completed' else '❌'

    print()
    separator('━')
    print(f'{DIM}[{ts()}]{RESET} {icon} {color}{BOLD}Sub-agent 完了: {agent_name}{RESET}')
    print(f'  {DIM}ステータス: {status}  所要時間: {fmt_duration(dur_ms)}  トークン: {total_tokens:,}  ツール呼出: {tool_uses}回{RESET}')
    separator('━')


def show_text(text):
    """テキスト応答を全文表示"""
    header('💬', '応答', GREEN)
    for line in text.split('\n'):
        print(f'  {line}')


def show_result(event):
    """最終結果"""
    result_text = event.get('result', '')
    is_error = event.get('is_error', False)
    dur_ms = event.get('duration_ms', 0)
    dur_api = event.get('duration_api_ms', 0)
    num_turns = event.get('num_turns', 0)
    cost = event.get('total_cost_usd', 0)
    usage = event.get('usage', {})
    input_tokens = usage.get('input_tokens', 0)
    output_tokens = usage.get('output_tokens', 0)
    cache_read = usage.get('cache_read_input_tokens', 0)
    cache_create = usage.get('cache_creation_input_tokens', 0)

    print()
    separator('═')
    if is_error:
        print(f'{RED}{BOLD}❌ セッション失敗{RESET}')
    else:
        print(f'{GREEN}{BOLD}✅ セッション完了{RESET}')

    if result_text:
        print()
        for line in result_text.split('\n'):
            print(f'  {line}')

    print()
    print(f'  {BOLD}統計:{RESET}')
    print(f'  ├─ 所要時間:     {fmt_duration(dur_ms)} (API: {fmt_duration(dur_api)})')
    print(f'  ├─ ターン数:     {num_turns}')
    print(f'  ├─ 入力トークン: {input_tokens:,} (キャッシュ読: {cache_read:,} / 作成: {cache_create:,})')
    print(f'  ├─ 出力トークン: {output_tokens:,}')
    if cost:
        print(f'  └─ {BOLD}コスト:        ${cost:.2f}{RESET}')

    # モデル別使用量
    model_usage = event.get('modelUsage', {})
    if model_usage:
        print()
        print(f'  {BOLD}モデル別使用量:{RESET}')
        for model_name, mu in model_usage.items():
            inp = mu.get('inputTokens', 0)
            out = mu.get('outputTokens', 0)
            cr = mu.get('cacheCreationTokens', 0)
            ch = mu.get('cacheReadTokens', 0)
            c = mu.get('costUsd', 0)
            print(f'  ├─ {model_name}')
            print(f'  │  入力: {inp:,}  出力: {out:,}  キャッシュ(作成/読): {cr:,}/{ch:,}  ${c:.2f}')

    separator('═')


def process_event(event, raw_log_file=None):
    """stream-json の1行を処理"""
    state.event_count += 1

    if raw_log_file:
        raw_log_file.write(json.dumps(event, ensure_ascii=False) + '\n')
        raw_log_file.flush()

    evt_type = event.get('type', '')

    # ── system イベント ──
    if evt_type == 'system':
        subtype = event.get('subtype', '')
        if subtype == 'init':
            show_init(event)
        elif subtype == 'api_retry':
            attempt = event.get('attempt', '?')
            error = event.get('error', '')
            print(f'  {YELLOW}⚠️  API リトライ ({attempt}回目): {error}{RESET}')
        elif subtype == 'task_started':
            show_task_started(event)
        elif subtype == 'task_progress':
            show_task_progress(event)
        elif subtype == 'task_notification':
            show_task_notification(event)
        return

    # ── assistant メッセージ ──
    if evt_type == 'assistant':
        msg = event.get('message', {})
        content = msg.get('content', [])
        if isinstance(content, list):
            for block in content:
                btype = block.get('type', '')
                if btype == 'thinking':
                    text = block.get('thinking', '')
                    if text.strip():
                        show_thinking(text)
                elif btype == 'text':
                    text = block.get('text', '')
                    if text.strip():
                        show_text(text)
                elif btype == 'tool_use':
                    name = block.get('name', 'unknown')
                    inp = block.get('input', {})
                    tid = block.get('id', '')
                    show_tool_use(name, inp, tid)
        return

    # ── user メッセージ (tool_result) ──
    if evt_type == 'user':
        msg = event.get('message', {})
        content = msg.get('content', [])
        if isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and block.get('type') == 'tool_result':
                    tid = block.get('tool_use_id', '')
                    is_error = block.get('is_error', False)
                    result_content = block.get('content', '')
                    show_tool_result(result_content, tid, is_error)
        elif isinstance(content, str):
            # ユーザーメッセージ（プロンプト）
            if content.strip():
                header('👤', 'ユーザー入力', BLUE)
                indent_text(content)
        return

    # ── rate_limit_event ──
    if evt_type == 'rate_limit_event':
        info = event.get('rate_limit_info', {})
        status = info.get('status', '')
        if status != 'allowed':
            print(f'  {YELLOW}⚠️  レート制限: {status}{RESET}')
        return

    # ── 最終結果 ──
    if evt_type == 'result':
        show_result(event)
        return


def main():
    parser = argparse.ArgumentParser(
        description='Claude Code stream-json パーサー — 研修デモ用リアルタイムログ整形')
    parser.add_argument('--raw-log', type=str, default=None,
                        help='生のJSONLを保存するファイルパス')
    args = parser.parse_args()

    raw_log_file = None
    if args.raw_log:
        raw_log_file = open(args.raw_log, 'w', encoding='utf-8')

    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
                process_event(event, raw_log_file)
            except json.JSONDecodeError:
                print(f'{DIM}{line}{RESET}')
    except KeyboardInterrupt:
        print(f'\n{YELLOW}中断されました{RESET}')
    finally:
        if raw_log_file:
            raw_log_file.close()

    print()


if __name__ == '__main__':
    main()
