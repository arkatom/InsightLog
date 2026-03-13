#!/bin/bash
# タスク完了時に通知音を鳴らす（macOS）
# settings.json の hooks.Stop に登録して使用
#
# 設定例:
# "hooks": {
#   "Stop": [{
#     "matcher": "",
#     "hooks": [{ "type": "command", "command": ".claude/hooks/notify-on-complete.sh" }]
#   }]
# }
afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true
exit 0
