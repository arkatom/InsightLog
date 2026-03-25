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
- Dev Container 内で `gh auth login` を実行しようとすると、書き込みエラーが発生する場合があります。これは、Dev Container の /home/node ディレクトリが Docker overlay FS で容量が限られているためです。

1. npm キャッシュを削除してスペース確保
npm cache clean --force

2. gh ログイン（スペースができたはず）
GH_CONFIG_DIR=/workspaces/InsightLog/.gh-config gh auth login

3. git credential 設定
GH_CONFIG_DIR=/workspaces/InsightLog/.gh-config gh auth setup-git

GH_CONFIG_DIR を前置することで、現在の /home/node への書き込みを避けています。

次回リビルド後は自動的に remoteEnv の設定が効いて /workspaces/InsightLog/.gh-config が使われるため、手動指定不要になります。

★ Insight ─────────────────────────────────────
- Dev Container の /home/node は Docker overlay FS で容量が限られる。VS Code Server（.vscode-server/）が数百MB〜1GB
消費することが多い。キャッシュ系ディレクトリはすべて /workspaces 配下（永続ボリューム）に向けるのが根本対策
- GH_CONFIG_DIR・NPM_CONFIG_CACHE・PLAYWRIGHT_BROWSERS_PATH を remoteEnv に集約することで、次回以降はリビルドするだけで自動的に適切なパスが使われる
─────────────────────────────────────────────────
