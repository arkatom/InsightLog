# 環境セットアップの仕方

## 1. ワーキングディレクトリに移動

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
- .env ファイルに `ANTHROPIC_API_KEY=your_api_key_here` を追加
- `claude` コマンドを打つ
- テーマを選択（例: Dark+）
- サブスクリプション利用かAPI利用かを選択（2. Anthropic Console account · API usage billing）
- 表示されるURLをコピーしてブラウザで開き、Authorize をクリックして認証を完了させる
  - 認証が完了しない場合、ターミナルに表示されているURLをコピーしてブラウザで開き、`Paste code here if prompted >` に認証コードを貼り付けて Enter を押す
- 認証が成功すると、ターミナルに「Authentication successful!」と表示されます
