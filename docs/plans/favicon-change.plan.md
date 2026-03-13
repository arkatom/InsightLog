# Favicon変更実装計画

**想定所要時間:** 3-5分
**難易度:** 低
**前提条件:** なし

## 概要

シンプルな赤い円（#EF4444）のSVGアイコンを作成し、faviconとして設定する。

## 実装対象ファイル

1. **public/favicon.svg** （新規作成） - 赤い円のSVGファイル
2. **index.html** - favicon参照の更新

## 実装手順

### 1. SVGファイルの作成

以下の内容で `public/favicon.svg` を作成：

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14" fill="#EF4444"/>
</svg>
```

* サイズ: 32x32
* 色: #EF4444（Tailwind CSSのred-500相当）
* シンプルな円形デザイン

### 2. HTMLでの参照設定

`index.html` の `<head>` 内に以下を追加（または既存のfavicon参照を置き換え）：

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

## 受け入れ基準

* `public/favicon.svg` が作成されている
* `index.html` での参照が正しく設定されている
* ブラウザのタブに赤い円のアイコンが表示される

## 検証方法

```bash
npm run dev
```

* [ ] ブラウザのタブに赤い円のアイコンが表示されているか
* [ ] ハードリロード（Ctrl+Shift+R / Cmd+Shift+R）後も表示されるか

## 注意点

* SVGファイルは軽量でスケーラブルなため、favicon.ico よりも推奨される
* キャッシュの影響で反映が遅れる場合があるため、ハードリロードを推奨
