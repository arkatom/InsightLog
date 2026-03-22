# Ship-from-Issue PRファクトリー デモ

Issue を起票して1コマンドを打つだけで、Claude Code が以下を自律実行します。

```
計画策定 → 実装 → ユニットテスト → E2E設計・録画 → コミット → PR作成 → レビュー
```

所要時間: **40〜60分**（実行中は放置でOK）

---

## 前提条件

| ツール | 確認コマンド |
|--------|-------------|
| Node.js 20+ | `node -v` |
| Claude Code | `claude --version` |
| GitHub CLI（認証済み） | `gh auth status` |

```bash
# GitHub CLI の認証がまだの場合
gh auth login
```

---

## 実行手順

### 1. リポジトリのルートに移動

```bash
cd /path/to/InsightLog
```

### 2. 依存パッケージをインストール

```bash
npm install
```

### 3. デモを起動

```bash
./demo/run.sh
```

これだけです。あとは Claude Code が自律実行します。

---

## 実行中に見えるもの

```
supervisor（opus）がパイプラインを管理
  ↓
[plan]      planner（opus）— コードベース調査 → 実装計画策定 → Devil's Advocate 検証
  ↓
[implement] implementer — 計画書を読んで実装
  ↓
[unit-test] test-writer  ─┐ 並行実行
[e2e-plan]  e2e-planner  ─┘
  ↓
[e2e-run]   e2e-runner — Playwright でブラウザ操作・動画録画
  ↓
[commit]    committer — 規約に従ってコミット
  ↓
[pr]        pr-creator — スクリーンショット付きで PR 作成
  ↓
[review]    reviewer（opus）— quality / UX / テスト の3観点 + Devil's Advocate でレビュー
```

### リアルタイム表示

実行中、ターミナルにはエージェントの全活動が整形表示されます:

```
[14:23:01] 🏁 セッション開始 (abc1234…)
──────────────────────────────────────────────────────
[14:23:05] 🚀 Agent: planner — spawn  実装計画を策定
[14:23:12] 🔧 Tool: Read  src/components/layout/Header.tsx
[14:23:12]    ✓ Read  export function Header() { ...
[14:23:15] 💭 既存のヘッダーにボタンを追加する形で実装すれば…
[14:24:01] 🚀 Agent: implementer — spawn  ROI機能を実装
[14:25:30] 🔧 Tool: Bash  npm run build
[14:25:35]    ✓ Bash  Build succeeded
[14:26:00] 🚀 Agent: test-writer — spawn  ユニットテスト作成
[14:26:00] 🚀 Agent: e2e-planner — spawn  E2Eテスト設計
```

進捗メモも別途確認できます:

```bash
# 別ターミナルで
tail -f claude-progress.txt
```

---

## 結果の確認

完了後、以下を確認してください。

| 成果物 | 場所 |
|--------|------|
| 作成された PR | ターミナル出力の末尾 |
| E2E 動画（.webm） | `demo/screenshots/test-results/` |
| Playwright レポート | `demo/screenshots/playwright-report/index.html` |
| テキストログ（stderr） | `demo/logs/session_<タイムスタンプ>.log` |
| 生JSONログ（全イベント） | `demo/logs/raw_<タイムスタンプ>.jsonl` |
| 実装計画書 | `demo/plan_output.md` |
| 進捗記録 | `claude-progress.txt` |

### ログの再生

生JSONログを使えば、実行後いつでもエージェントの活動を再生できます:

```bash
cat demo/logs/raw_20260322_142300.jsonl | python3 demo/stream-parser.py
```

---

## ファイル構成

```
demo/
├── README.md               # このファイル
├── run.sh                  # デモ起動スクリプト
├── stream-parser.py        # stream-json 整形表示パーサー（ログ再生にも使用）
├── pipeline.json           # フェーズ DAG テンプレート（git 管理・変更不要）
├── feature_list.json       # 実行時に run.sh が生成（gitignore・触らない）
├── plan_output.md          # 実行時に planner が生成する実装計画書（gitignore）
├── fallback/
│   └── issue.md            # GitHub 未認証時のフォールバック仕様書
├── logs/                   # セッションログ + 生JSONログ（gitignore）
└── screenshots/            # E2E スクリーンショット・動画・レポート（gitignore）
```

### ファイルの役割分担

| ファイル | 役割 | git 管理 | 誰が読む |
|---------|------|---------|---------|
| `pipeline.json` | **どう進めるか**（エージェント順序・依存関係の DAG テンプレート） | ✅ committed | run.sh のみ |
| `feature_list.json` | パイプライン実行状態（pipeline.json + Issue データから毎回生成） | ❌ gitignore | supervisor のみ |
| `fallback/issue.md` | **何を作るか**（製品仕様・受け入れ条件）— GitHub Issue の代替 | ✅ committed | planner, implementer, reviewer |

`feature_list.json` は `run.sh` が毎回クリーンな状態で生成するため、手動編集不要です。

---

## 再実行する場合

```bash
./demo/run.sh
```

再実行時、`feature_list.json` は自動的に上書き生成されます（手動リセット不要）。

既存の GitHub Issue は `demo/github_issue_number.txt` に番号が保存されており、再実行時に再利用されます。

---

## トラブルシューティング

**`claude: command not found`**
Claude Code がインストールされていません。[公式サイト](https://claude.ai/code)からインストールしてください。

**`gh auth status` で認証エラー**
`gh auth login` で GitHub CLI を認証してください。Issue 作成・PR 作成に必要です。

**途中でエラー終了した場合**
`claude-progress.txt` と `demo/logs/` の最新ログを確認してください。
完了済みフェーズはそのまま残るので、`feature_list.json` の `"pending"` フェーズから再開できます。
