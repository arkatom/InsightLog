# AI研修環境 自動プロビジョニング実装計画

## Context

AI開発研修（Claude Code ハンズオン）において、受講生の環境構築摩擦をゼロにするための自動プロビジョニングシステムを構築する。CSVから受講生個別のZIPパッケージを一括生成し、受講生はZIP解凍→Dev Container起動→`setup.sh`実行の3ステップで即座に開発を開始できるようにする。

### 現状

- `.devcontainer/devcontainer.json` と `Dockerfile` は仕様書の内容と**ほぼ一致済み**（追加作業不要）
- `.env.example` には `ANTHROPIC_API_KEY` のみ記載
- `setup.sh` は未作成
- ZIP一括生成スクリプトは未作成
- `vite.config.ts` に `--host` オプション未設定（コンテナ外ブラウザからアクセス不可）

---

## 実装ステップ

### Step 1: `.env.example` の更新

**ファイル**: `.env.example`

受講生個別情報のフィールドを追加する。

```
ANTHROPIC_API_KEY=
TRAINEE_NAME=
TRAINEE_EMAIL=
```

---

### Step 2: `setup.sh` の作成

**ファイル**: `setup.sh`（プロジェクトルート）

仕様書に記載のスクリプトをそのまま配置する。主要機能:

1. `.env` から環境変数を読み込み
2. GitHub CLI デバイスフロー認証
3. `git init` + ローカルGit設定（TRAINEE_NAME, TRAINEE_EMAIL）
4. GitHub プライベートリポジトリの自動作成 + Push

---

### Step 3: `vite.config.ts` への `server.host` 追加

**ファイル**: `vite.config.ts`

Dev Container 内から外部ブラウザでアクセスするため、Vite開発サーバーを `0.0.0.0` でリッスンさせる。

```ts
server: {
  host: true,
},
```

`defineConfig` 内の `build` セクションと同階層に追加。

---

### Step 4: ZIP一括生成スクリプトの作成

**ファイル**: `.devcontainer/provisioning/generate_zips.js`

プロジェクトは `"type": "module"` なので、仕様書の CommonJS コードを ESM に変換して配置する。

主要な変更点:
- `require()` → `import` に変換
- `fs`, `path`, `child_process` を ESM import で読み込み
- `import.meta.dirname` でスクリプトの基準パスを取得
- パスを `.devcontainer/provisioning/` 基準からプロジェクトルート基準に解決

動作フロー:
1. `.devcontainer/provisioning/trainees.csv` を読み込み
2. プロジェクトルートの `base_template/` ディレクトリをテンプレートとしてコピー
3. 各受講生の `.env` を生成・配置
4. ZIP化して `dist_zips/` に出力

実行方法: `node .devcontainer/provisioning/generate_zips.js`

**ファイル**: `.devcontainer/provisioning/trainees.csv.example`

サンプルCSVテンプレート（実際のAPIキーを含まない）。

```csv
name,email,api_key
"Taro Yamada",taro@example.com,sk-ant-xxxxx
"Hanako Sato",hanako@example.com,sk-ant-yyyyy
```

---

### Step 5: `.gitignore` の更新

**ファイル**: `.gitignore`

以下のエントリを追加:

```gitignore
# プロビジョニング（研修用ZIP生成）
dist_zips/
base_template/
.devcontainer/provisioning/trainees.csv
```

- `dist_zips/` — 生成されたZIPパッケージ出力先
- `base_template/` — ZIP生成用テンプレートディレクトリ
- `.devcontainer/provisioning/trainees.csv` — APIキーを含む実データ（.exampleのみコミット）

---

### Step 6: `SETUP.md` の更新

**ファイル**: `SETUP.md`

現在の開発者向けセットアップ手順に加えて、研修受講者向けの簡易手順セクションを追記:

1. ZIPを解凍してVS Codeで開く
2. 「Reopen in Container」で起動
3. `bash ./setup.sh` を実行
4. ブラウザでGitHub認証を完了

---

### Step 7: `devcontainer.json` — 変更不要

現在の設定は仕様書と一致済み。既存の `postStartCommand`（GITHUB_TOKEN 自動認証）は Codespaces 環境で有用なため維持する。

### Step 8: `Dockerfile` — 変更不要

Claude Code のネイティブインストールとグローバル化は実装済み。

---

## 変更ファイル一覧

| ファイル | 操作 |
|---------|------|
| `.env.example` | 修正（フィールド追加） |
| `setup.sh` | 新規作成 |
| `vite.config.ts` | 修正（server.host追加） |
| `.devcontainer/provisioning/generate_zips.js` | 新規作成 |
| `.devcontainer/provisioning/trainees.csv.example` | 新規作成 |
| `.gitignore` | 修正（エントリ追加） |
| `SETUP.md` | 修正（研修フロー追記） |

---

## 検証方法

1. **setup.sh の動作確認**: Dev Container 内で `bash ./setup.sh` を実行し、GitHub認証→リポジトリ作成→Pushが完了するか確認
2. **Vite --host**: Dev Container 内で `npm run dev` → ホストブラウザから `localhost:5173` にアクセスできるか確認
3. **ZIP生成**: `.devcontainer/provisioning/trainees.csv.example` を `.devcontainer/provisioning/trainees.csv` にコピー、`base_template/` を用意して `node .devcontainer/provisioning/generate_zips.js` で ZIP が `dist_zips/` に生成されるか確認
4. **生成ZIPの展開テスト**: 生成されたZIPを展開し、`.env` に正しい受講生情報が記載されているか確認
