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

進捗はリアルタイムで確認できます:

```bash
# 別ターミナルで
tail -f claude-progress.txt
```

---

## 結果の確認

完了後、以下を確認してください。

| 成果物 | 場所 |
|--------|------|
| 作成された PR | ログ末尾の URL |
| E2E 動画（.webm） | `demo/screenshots/test-results/` |
| Playwright レポート | `demo/screenshots/playwright-report/index.html` |
| セッションログ | `demo/logs/session_<タイムスタンプ>.log` |
| 実装計画書 | `demo/plan_output.md` |
| 進捗記録 | `claude-progress.txt` |

---

## ファイル構成

```
demo/
├── README.md               # このファイル
├── run.sh                  # デモ起動スクリプト
├── issue.md                # 実装する機能の仕様（受け入れ条件）
├── feature_list.json       # パイプライン DAG 定義（エージェント・依存関係）
├── plan_output.md          # 実行時に planner が生成する実装計画書
├── logs/                   # セッションログ
└── screenshots/            # E2E スクリーンショット・動画・レポート
```

### issue.md と feature_list.json の役割分担

| ファイル | 役割 | 誰が読む |
|---------|------|---------|
| `issue.md` | **何を作るか**（製品仕様・受け入れ条件） | planner, implementer, reviewer |
| `feature_list.json` | **どう進めるか**（エージェントの順序・依存関係） | supervisor のみ |

issue.md は GitHub Issue としても管理されます（run.sh が自動作成）。
feature_list.json は GitHub には載せません。ローカルのパイプライン設定です。

---

## 再実行する場合

```bash
# feature_list.json のステータスをリセット
# （全フェーズの "done" を "pending" に戻す）
sed -i '' 's/"done"/"pending"/g' demo/feature_list.json

./demo/run.sh
```

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
