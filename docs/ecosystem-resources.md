# Claude Code エコシステムリソース集

Part 4「Claude Code を育てる PDCA」の終盤、slide 31「エコシステムの追いかけ方」で講師が紹介できるリソースの一覧。受講者が研修後に「次に何を見るか」の出発点として参照する想定。

---

## Anthropic 公式

| リソース | URL | 用途 |
|---------|-----|------|
| Claude Code Docs | https://docs.claude.com/en/docs/claude-code | CLI ツール公式ドキュメント。settings / hooks / skills / sub-agents の正式仕様 |
| Anthropic Blog | https://www.anthropic.com/blog | 製品アップデート・機能追加の一次情報 |
| Anthropic Engineering Blog | https://www.anthropic.com/engineering | 設計哲学・ベストプラクティス・ハーネスエンジニアリングの議論 |
| Claude Code Changelog | https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md | リリースノート (週次〜隔週で更新) |
| Anthropic Sub-agents Docs | https://code.claude.com/docs/en/sub-agents.md | Sub-Agent 公式ガイド (本研修 Part 6 の補強) |
| Claude Code Hooks Docs | https://docs.claude.com/en/docs/claude-code/hooks | Hook 公式仕様 (本研修 Part 6 / Part 7 の補強) |
| Claude Agent SDK | https://docs.claude.com/en/api/agent-sdk | カスタム Agent を SDK で構築する場合の API リファレンス |

---

## コミュニティ Skill / Plugin Marketplace

| リソース | URL | 特徴 |
|---------|-----|------|
| skills.sh | https://skills.sh | Vercel が運営する Open Agent Skills Ecosystem。Skill 形式で配布されている |
| OpenClaw | https://openclaw.com | コミュニティ Claude Code 拡張集 |
| aitmpl.com | https://aitmpl.com | テンプレート集 (Skill / Sub-Agent / Hook の雛形) |
| claude-plugins (GitHub) | https://github.com/anthropics/claude-plugins | Anthropic 公式プラグインリポ |

---

## SNS / コミュニティ

| リソース | URL | 用途 |
|---------|-----|------|
| Claude Code Discord (公式) | https://discord.gg/anthropic | 公式 Discord、Anthropic 社員も参加 |
| r/ClaudeAI (Reddit) | https://www.reddit.com/r/ClaudeAI/ | コミュニティの議論・事例共有 |
| X (旧 Twitter) `#ClaudeCode` | (検索) | 最新事例・速報の流通経路 |

---

## 信頼できる個人ブログ・実装事例

| 著者 | URL | 注目ポイント |
|------|-----|--------------|
| Mitchell Hashimoto | https://mitchellh.com/ | ハーネスエンジニアリング提唱者。Claude Code 設計思想の言語化 |
| Simon Willison | https://simonwillison.net/ | LLM 全般の観察 + Claude Code 実例レビュー |
| Iain Harper | (個人ブログ) | Claude Code 実装事例の詳細解説 |
| Anthropic Engineering YouTube | https://www.youtube.com/@anthropic-ai | 公式技術解説動画 |

---

## 日本語コミュニティ・記事

| リソース | URL | 特徴 |
|---------|-----|------|
| Zenn `claude-code` タグ | https://zenn.dev/topics/claudecode | 日本語実装記事 |
| Qiita `Claude Code` タグ | https://qiita.com/tags/claudecode | 日本語実装記事 (Zenn より入門寄り) |
| note `Claude Code` タグ | https://note.com/hashtag/ClaudeCode | 体験談・運用ノウハウ |

---

## このリポジトリ内の関連資料

| ファイル | 用途 |
|---------|------|
| `docs/official_docs/INDEX.md` | 公式ドキュメント (取り込み済み) のインデックス |
| `apps/InsightLog/.claude/skills/` | 本研修で扱った Skill 6 個 |
| `apps/InsightLog/.claude/agents/` | 本研修で扱った Sub-Agent 7 体 |
| `apps/InsightLog/.claude/hooks/` | 本研修で扱った Hook 実装例 |
| `docs/research/claude-code-internals/` | 実機検証で得た Claude Code 内部仕様の知見 |

---

## 講師ノート（Part 4 slide 31 で活用する想定）

- このファイルを VS Code で開いて、各カテゴリのリンクを 1 つずつ紹介
- 「研修が終わった後、どこを見続けるか」の地図として機能
- 受講者には URL をコピーさせるのではなく、「リポジトリ内の `apps/InsightLog/docs/ecosystem-resources.md` に集約してある」と教える方が実用的
- Anthropic 公式 + Zenn / Qiita 日本語コミュニティ の **2 軸** をまず勧める。Discord / Reddit は中級者以上向け
