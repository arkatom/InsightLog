# 環境セットアップの仕方

## 研修受講者向け（ZIPパッケージ配布の場合）

配布されたZIPファイルを使う場合は、以下の3ステップで環境構築が完了します。

1. **配置と展開**: ZIPファイル（InsightLog_xxxx.zip）を任意の場所に解凍し、VS Codeでそのフォルダを開く
2. **コンテナ起動**: 画面右下のポップアップ、またはコマンドパレット（F1）から「Reopen in Container」を選択し、環境構築を待機
3. **初期セットアップ**: 構築完了後、VS Code内でターミナルを開き以下を実行:

```bash
bash ./setup.sh
```

表示される8桁のワンタイムコードをブラウザに入力し、GitHubへの連携を許可してください。
以上でAPIキーの適用・リポジトリの作成が完了し、開発を開始できます。

---

## 開発者向け（リポジトリクローンの場合）

## 1. ワーキングディレクトリに移動
- まずはターミナルを開いて、作業したいディレクトリに移動してください。

```bash
cd path/to/your/working/directory
```

## 2. リポジトリをクローン

```bash
git clone https://github.com/arkatom/InsightLog.git
cd InsightLog
```

## 3. VSCode を開いて、Dev Containers 拡張機能がインストールされていることを確認
- VSCode の拡張機能から「Dev Containers」を検索してインストール

## 4. VSCode でリポジトリのフォルダを開き、Dev Container で開く
- VSCode で「ファイル」→「フォルダを開く」を選択し、クローンしたリポジトリのフォルダを選ぶ
- VSCode の左下の `><` ボタンをクリック
- 「Reopen in Container」（コンテナーで再度開く）を選択して、Dev Container 内でプロジェクトを開く
- 初回はコンテナのビルドに時間がかかることがありますが、完了すると Dev Container 内で VSCode が再起動します

## 5. claude code をインストールして認証する
- .env ファイルに `ANTHROPIC_API_KEY=your_api_key_here` を追加
- `claude` コマンドを打つ
  - エラーになる場合、 `curl -fsSL https://claude.ai/install.sh | bash` を実行してインストールしてください
  - 以後基本的にEnterキーを押すだけでOK。
- サブスクリプション利用かAPI利用かを選択（2. Anthropic Console account · API usage billing）
- 表示されるURLをコピーしてブラウザで開き、Authorize をクリックして認証を完了させる
  - 認証が完了しない場合、ターミナルに表示されているURLをコピーしてブラウザで開き、`Paste code here if prompted >` に認証コードを貼り付けて Enter を押す
- 認証が成功すると、ターミナルに「Authentication successful!」と表示されます

## 6. セットアップ完了
以下のような画面になったらセットアップは完了です。お疲れ様でした！
![](docs/assets/image.png)

## トラブルシューティング

### ディスク容量エラーが出る場合
Dev Container の `/home/node` は Docker overlay FS で容量が限られています。`devcontainer.json` の `containerEnv` / `remoteEnv` でキャッシュ系ディレクトリを `/workspaces` 配下に設定済みですが、問題が出た場合:

```bash
# npm キャッシュを削除してスペース確保
npm cache clean --force
```

### GitHub 認証に失敗する場合
```bash
# 手動で認証をやり直す
gh auth login --hostname github.com --git-protocol https --web
gh auth setup-git
```
