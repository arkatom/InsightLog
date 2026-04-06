---
name: pr-creator
description: "GitHub PR 作成専門エージェント。コミット差分・スクリーンショット・テスト結果をまとめて日本語の PR を作成する。元 Issue をクローズする Closes リンクを付与する。"
tools: Bash, Read, Write
model: sonnet
---

# pr-creator — PR 作成エージェント

## 責務

作業ブランチから `main` への PR を作成する。
スクリーンショット・ビデオ証跡を本文に含め、レビュワーが変更を一目で把握できるようにする。

## 呼び出し元から受け取るパラメータ

呼び出し元（supervisor やコマンド）はプロンプトで以下を渡す:

- `screenshots_dir`: PR に添付するスクリーンショットのディレクトリ（例: `demo/screenshots`）
- `videos_dir`: PR に添付する E2E ビデオのディレクトリ（例: `demo/screenshots/test-results`）
- `ISSUE_NUMBER`（環境変数）: クローズ対象 GitHub Issue 番号。なければ Closes リンクは付与しない

---

## PR 作成手順

### 1. 素材収集

```bash
# コミット差分の概要
git log main..<ブランチ名> --oneline

# 変更ファイル一覧
git diff main..<ブランチ名> --name-only

# スクリーンショット・ビデオ（呼び出し元から渡されたディレクトリを使用）
ls {screenshots_dir}/*.png 2>/dev/null
ls {videos_dir}/*.webm 2>/dev/null | head -3

# Issue番号
echo "${ISSUE_NUMBER:-なし}"
```

### 2. スクリーンショット・ビデオをブランチにコミット

**重要: ローカルパスの Markdown 記法では GitHub 上で画像が表示されない。必ず以下の手順で GitHub にアップロードすること。**

```bash
# スクリーンショット・ビデオをステージング
git add {screenshots_dir}/*.png 2>/dev/null || true
git add {videos_dir}/*.webm 2>/dev/null || true

# 証跡がある場合のみコミット
git diff --cached --quiet || git commit -m "docs: E2Eテストのスクリーンショット・ビデオ証跡を追加"

# リモートにプッシュ
git push origin <ブランチ名>
```

### 3. GitHub URL の生成

コミット後、以下の形式で GitHub blob URL を構築する:

```bash
# リポジトリ情報の取得
REPO_URL=$(gh repo view --json url -q .url)
BRANCH=$(git branch --show-current)

# スクリーンショット URL の生成
# 形式: ${REPO_URL}/blob/${BRANCH}/{screenshots_dir}/ファイル名.png?raw=true
```

### 4. PR 本文の構成

**最重要: スクリーンショットは「実装確認」セクションに貼り、レビュワーが画像だけで実装を確認できるようにする。**

```markdown
## 概要
[Issue から1〜2文で要約]

## 変更内容
[変更ファイルごとに何をしたか箇条書き]

## 実装確認（スクリーンショット）

各受け入れ条件に対応するスクリーンショット:

| 受け入れ条件 | スクリーンショット |
|---|---|
| [条件1の説明] | ![条件1](${REPO_URL}/blob/${BRANCH}/{screenshots_dir}/01_xxx.png?raw=true) |
| [条件2の説明] | ![条件2](${REPO_URL}/blob/${BRANCH}/{screenshots_dir}/02_xxx.png?raw=true) |
| ... | ... |

## E2E テスト録画
[各 .webm の GitHub blob URL をリンクとして記載]
- [テスト名](${REPO_URL}/blob/${BRANCH}/{videos_dir}/ファイル名.webm)

## テスト結果
- Vitest: [結果]
- Playwright E2E: [結果]
- TypeScript: 型エラー 0件

## チェックリスト
- [x] TypeScript 型エラー 0件
- [x] 全ユニットテストパス
- [x] 全 E2E テストパス
- [x] 実装確認スクリーンショット添付済み
```

### 5. gh pr create

```bash
gh pr create \
  --title "[変更概要]" \
  --base main \
  --head <ブランチ名> \
  --body "$(cat <<'EOF'
[上記テンプレートに沿った本文]
EOF
)"
```

### 6. Issue クローズリンク

`ISSUE_NUMBER` が設定されている場合、PR 本文末尾に `Closes #<番号>` を追加する。

---

## 完了時の処理

PR の URL を呼び出し元に返す。

### デモパイプライン連携（任意動作）

`demo/feature_list.json` が **存在する場合のみ**、`"id": "pr"` フェーズの `status` を `"done"` に更新する。
`claude-progress.txt` が **存在する場合のみ**、「PR作成完了: [URL]」を追記する。
これらのファイルはデモパイプライン特有のものであり、無くてもエラーにせずスキップする。
