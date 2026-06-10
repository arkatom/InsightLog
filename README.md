# InsightLog

ブラウザで動くPWAアプリケーション。

## セットアップ

研修環境は GitHub Codespaces を利用します。

### 開発サーバーの起動

```bash
npm install
npm run dev
```

起動後、http://localhost:5173/ にアクセスしてください（Codespaces ではポートが自動転送されます）。

## 主なコマンド

```bash
npm run dev      # 開発サーバー
npm run build    # 本番ビルド
npm run test     # テスト実行
```

## 技術スタック

React 19 + TypeScript / Vite 7 / Tailwind CSS 4 / Zustand / Dexie.js / Recharts / Vitest

## テンプレートの更新を取り込む

このリポジトリはテンプレートから作成されています。研修中にテンプレート側が更新された場合、以下のコマンド一発で取り込めます（初回・2回目以降どちらでも同じコマンドで動きます）。

```bash
(git remote add template https://github.com/arkatom/InsightLog.git 2>/dev/null || git remote set-url template https://github.com/arkatom/InsightLog.git) && git fetch template && git merge template/main --allow-unrelated-histories
```

コンフリクトが発生した場合は、テンプレート側を正として取り込んでください。

```bash
git checkout --theirs .
git add .
git commit -m "テンプレートの更新を取り込み"
```

## 同期実施履歴 / 復元手順（講師管理）

### 2026-06-10 同期実施

研修第3回前にテンプレート最新版へ完全同期しました。同期前の状態は `backup/before-sync-2026-06-10` ブランチに保全されています。

### 同期前状態への復元（緊急時）

Codespace 内で以下を実行してください。

```bash
git fetch origin backup/before-sync-2026-06-10
git reset --hard origin/backup/before-sync-2026-06-10
git push --force origin main
```

実行前に、未 commit のローカル変更を別ブランチに退避してください。

```bash
git stash push -u -m "before-restore"
# 戻したい場合: git stash pop
```

困ったら講師にご連絡ください。

## ライセンス

MIT License
