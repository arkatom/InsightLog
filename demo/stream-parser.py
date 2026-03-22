#!/usr/bin/env python3
"""
Claude Code stream-json パーサー — 研修デモ用リアルタイムログ整形

stdin から stream-json (NDJSON) を読み取り、
エージェント起動・ツール呼び出し・思考・結果を色付きで整形表示する。
同時に生のJSONを指定ファイルに保存する。

使い方:
  claude -p "..." --output-format stream-json --verbose \
    | python3 demo/stream-parser.py [--raw-log demo/logs/raw.jsonl]
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
BG_YELLOW = '\033[43m'
BG_RED = '\033[41m'


def timestamp():
    return datetime.now().strftime('%H:%M:%S')


def separator(char='─', width=80):
    print(f'{DIM}{char * width}{RESET}')


def print_agent_event(name, action, detail=''):
    icon = '🚀' if action == 'spawn' else '✅' if action == 'done' else '🔄'
    color = CYAN if action == 'spawn' else GREEN if action == 'done' else YELLOW
    print(f'{DIM}[{timestamp()}]{RESET} {icon} {color}{BOLD}Agent: {name}{RESET} — {action}', end='')
    if detail:
        print(f'  {DIM}{detail}{RESET}')
    else:
        print()


def print_tool_call(tool_name, params_summary=''):
    print(f'{DIM}[{timestamp()}]{RESET} 🔧 {YELLOW}Tool: {tool_name}{RESET}', end='')
    if params_summary:
        truncated = textwrap.shorten(params_summary, width=120, placeholder='…')
        print(f'  {DIM}{truncated}{RESET}')
    else:
        print()


def print_tool_result(tool_name, success=True, summary=''):
    icon = '✓' if success else '✗'
    color = GREEN if success else RED
    print(f'{DIM}[{timestamp()}]{RESET}    {color}{icon} {tool_name}{RESET}', end='')
    if summary:
        truncated = textwrap.shorten(summary, width=120, placeholder='…')
        print(f'  {DIM}{truncated}{RESET}')
    else:
        print()


def print_thinking(text):
    lines = text.strip().split('\n')
    preview = lines[0] if lines else ''
    truncated = textwrap.shorten(preview, width=100, placeholder='…')
    print(f'{DIM}[{timestamp()}]{RESET} 💭 {ITALIC}{DIM}{truncated}{RESET}')


def print_text(text):
    # テキスト出力は最終応答の一部。簡潔に表示
    for line in text.strip().split('\n'):
        print(f'   {line}')


def extract_tool_params_summary(tool_input):
    """ツールパラメータからわかりやすいサマリーを抽出"""
    if not isinstance(tool_input, dict):
        return str(tool_input)[:100]

    # Agent tool — プロンプトの先頭を表示
    if 'prompt' in tool_input:
        return textwrap.shorten(tool_input['prompt'], width=100, placeholder='…')
    # Bash tool
    if 'command' in tool_input:
        return tool_input['command'][:100]
    # Read tool
    if 'file_path' in tool_input:
        return tool_input['file_path']
    # Edit/Write tool
    if 'file_path' in tool_input and 'old_string' in tool_input:
        return f"{tool_input['file_path']} (edit)"
    # Grep tool
    if 'pattern' in tool_input:
        path = tool_input.get('path', '.')
        return f'/{tool_input["pattern"]}/ in {path}'
    # Glob tool
    if 'pattern' in tool_input:
        return tool_input['pattern']
    # 汎用
    keys = list(tool_input.keys())[:3]
    return ', '.join(f'{k}={tool_input[k]}' for k in keys if not isinstance(tool_input[k], (dict, list)))


def process_message(msg):
    """Claude API メッセージ（assistant/tool_result 等）を処理"""
    role = msg.get('role', '')
    content = msg.get('content', '')

    if role == 'assistant':
        if isinstance(content, list):
            for block in content:
                block_type = block.get('type', '')
                if block_type == 'thinking':
                    print_thinking(block.get('thinking', ''))
                elif block_type == 'text':
                    text = block.get('text', '').strip()
                    if text:
                        print_text(text)
                elif block_type == 'tool_use':
                    name = block.get('name', 'unknown')
                    inp = block.get('input', {})
                    summary = extract_tool_params_summary(inp)

                    # Agent tool は特別扱い
                    if name == 'Agent':
                        agent_name = inp.get('name', inp.get('subagent_type', 'sub-agent'))
                        desc = inp.get('description', '')
                        print_agent_event(agent_name, 'spawn', desc)
                    else:
                        print_tool_call(name, summary)
        elif isinstance(content, str) and content.strip():
            print_text(content)

    elif role == 'tool':
        # tool_result
        if isinstance(content, list):
            for block in content:
                if block.get('type') == 'tool_result':
                    is_error = block.get('is_error', False)
                    text = ''
                    result_content = block.get('content', '')
                    if isinstance(result_content, str):
                        text = result_content[:150]
                    elif isinstance(result_content, list):
                        for sub in result_content:
                            if sub.get('type') == 'text':
                                text = sub.get('text', '')[:150]
                                break
                    tool_id = block.get('tool_use_id', '')
                    print_tool_result(tool_id[:12], success=not is_error, summary=text)


def process_event(event, raw_log_file=None):
    """stream-json の1行を処理"""
    if raw_log_file:
        raw_log_file.write(json.dumps(event, ensure_ascii=False) + '\n')
        raw_log_file.flush()

    evt_type = event.get('type', '')

    # ── メッセージ（assistant / tool）──
    if evt_type == 'message':
        process_message(event.get('message', event))
        return

    # ── stream_event: テキストデルタ / ツール結果 ──
    if evt_type == 'stream_event':
        inner = event.get('event', {})
        delta = inner.get('delta', {})
        delta_type = delta.get('type', '')

        if delta_type == 'text_delta':
            # リアルタイムテキストは表示しない（最終メッセージで表示）
            pass
        elif delta_type == 'thinking_delta':
            # 思考デルタもまとめて表示するので個別は省略
            pass
        elif delta_type == 'input_json_delta':
            pass
        return

    # ── content_block_start: ツール呼び出し開始 ──
    if evt_type == 'content_block_start':
        block = event.get('content_block', {})
        if block.get('type') == 'tool_use':
            name = block.get('name', 'unknown')
            # Agent の場合は後で input が来てから表示
            if name != 'Agent':
                print_tool_call(name)
        elif block.get('type') == 'thinking':
            pass  # thinking 開始
        return

    # ── content_block_stop ──
    if evt_type == 'content_block_stop':
        return

    # ── result (ツール実行結果) ──
    if evt_type == 'result':
        result = event.get('result', '')
        subtype = event.get('subtype', '')
        if subtype == 'tool_result' or 'tool_use_id' in event:
            is_error = event.get('is_error', False)
            text = str(result)[:150] if result else ''
            print_tool_result('result', success=not is_error, summary=text)
        elif isinstance(result, str) and result.strip():
            print_text(result)
        return

    # ── system イベント ──
    if evt_type == 'system':
        subtype = event.get('subtype', '')
        if subtype == 'api_retry':
            attempt = event.get('attempt', '?')
            error = event.get('error', '')
            print(f'{DIM}[{timestamp()}]{RESET} ⚠️  {YELLOW}API リトライ ({attempt}回目): {error}{RESET}')
        elif subtype == 'init':
            session_id = event.get('session_id', '')[:8]
            print(f'{DIM}[{timestamp()}]{RESET} 🏁 {BOLD}セッション開始{RESET} {DIM}({session_id}…){RESET}')
            separator()
        return

    # ── agent サブプロセス関連 ──
    if evt_type in ('agent_start', 'subagent_start'):
        name = event.get('name', event.get('agent_name', 'sub-agent'))
        print_agent_event(name, 'spawn')
        return
    if evt_type in ('agent_end', 'subagent_end'):
        name = event.get('name', event.get('agent_name', 'sub-agent'))
        print_agent_event(name, 'done')
        return

    # ── ツール実行イベント ──
    if evt_type == 'tool_use':
        name = event.get('name', 'unknown')
        inp = event.get('input', {})
        if name == 'Agent':
            agent_name = inp.get('name', inp.get('subagent_type', 'sub-agent'))
            desc = inp.get('description', '')
            print_agent_event(agent_name, 'spawn', desc)
        else:
            summary = extract_tool_params_summary(inp)
            print_tool_call(name, summary)
        return

    if evt_type == 'tool_result':
        is_error = event.get('is_error', False)
        name = event.get('name', 'tool')
        content = event.get('content', '')
        text = ''
        if isinstance(content, str):
            text = content[:150]
        elif isinstance(content, list):
            for sub in content:
                if isinstance(sub, dict) and sub.get('type') == 'text':
                    text = sub.get('text', '')[:150]
                    break
        print_tool_result(name, success=not is_error, summary=text)
        return


def main():
    parser = argparse.ArgumentParser(description='Claude Code stream-json パーサー')
    parser.add_argument('--raw-log', type=str, default=None,
                        help='生のJSONLを保存するファイルパス')
    args = parser.parse_args()

    raw_log_file = None
    if args.raw_log:
        raw_log_file = open(args.raw_log, 'w', encoding='utf-8')

    print()
    print(f'{BOLD}{BG_BLUE}{WHITE} 🔍 Claude Code ストリームモニター {RESET}')
    print(f'{DIM}エージェント起動・ツール呼び出し・思考をリアルタイム表示{RESET}')
    separator('═')
    print()

    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                event = json.loads(line)
                process_event(event, raw_log_file)
            except json.JSONDecodeError:
                # JSON でない行はそのまま表示
                print(f'{DIM}{line}{RESET}')
    except KeyboardInterrupt:
        print(f'\n{YELLOW}中断されました{RESET}')
    finally:
        if raw_log_file:
            raw_log_file.close()

    print()
    separator('═')
    print(f'{BOLD}ストリーム終了{RESET}')
    if args.raw_log:
        print(f'{DIM}生ログ: {args.raw_log}{RESET}')
    print()


if __name__ == '__main__':
    main()
