# TaskForm 入力欄 UI 改善プラン

## Context（背景）

InsightLog アプリの TaskForm.tsx に存在する3つの数値入力欄（「所要時間」「AI未利用時の所要時間」「手戻り回数」）について、ユーザーから「わかりにくい」という指摘を受けました。

### 現在の問題

- ラベルが存在せず、プレースホルダーのみで「分」「AI無」「回」と表示
- 何を入力すべきか直感的に理解できない
- モバイル対応していない（`grid-cols-3` 固定で、小画面では見づらい）

### 改善の目的

1. 各入力欄の目的を明確にし、直感的に理解できるようにする
2. モバイルデバイスでの操作性を向上させる
3. アクセシビリティを向上させる
4. 既存の UI パターンとの一貫性を保つ

---

## 実装計画

### 1. 修正対象ファイル

**メインファイル**:

- `src/components/task/TaskForm.tsx` (243-286行目)

**参考ファイル**:

- `src/components/settings/SettingsModal.tsx` - ラベルスタイルパターン
- `src/components/task/TaskForm.tsx` (198-241行目) - ツールチップパターン

---

### 2. 具体的な変更内容

#### 2.1 各入力欄にラベルを追加

既存のプロジェクトパターン（`text-xs text-primary-500 mb-1`）を使用して、各フィールドに明確なラベルを配置:

- **所要時間**: シンプルなラベル
- **AI未利用時の所要時間**: ラベル + ツールチップ（説明が必要なため）
- **手戻り回数**: シンプルなラベル

#### 2.2 レスポンシブ対応

`grid-cols-3` を `grid-cols-1 sm:grid-cols-3` に変更:

- モバイル（<640px）: 縦積み表示
- タブレット以上（≥640px）: 横並び表示

#### 2.3 ツールチップの追加

「AI未利用時の所要時間」フィールドに Info アイコンを追加し、ホバー時に以下の説明を表示:
> AIを使わずに同じタスクを実施した場合の想定時間を入力します。時間削減効果の測定に使用されます。

#### 2.4 アクセシビリティ向上

- 各 `<label>` 要素に `htmlFor` 属性を追加
- 各 `<input>` 要素に一意の `id` を付与:
  - `duration-input`
  - `time-no-ai-input`
  - `rework-count-input`

#### 2.5 プレースホルダーの調整

ラベルで意味が明確になったため、プレースホルダーを数値例に変更:

- `placeholder="分"` → `placeholder="0"`
- `placeholder="AI無"` → `placeholder="0"`

---

### 3. コード変更詳細

**変更箇所**: TaskForm.tsx 243-286行目

**変更前のコード構造**:

```tsx
<div className="grid grid-cols-3 gap-3">
  <div className="flex items-center gap-2 px-3 py-3 bg-primary-50 rounded-lg ...">
    <Clock size={14} />
    <input placeholder="分" />
    <span>分</span>
  </div>
  {/* 他2つも同様 */}
</div>
```

**変更後のコード構造**:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
  <div>
    <label htmlFor="duration-input" className="block text-xs text-primary-500 mb-1">
      所要時間
    </label>
    <div className="flex items-center gap-2 px-3 py-3 bg-primary-50 rounded-lg ...">
      <Clock size={14} />
      <input id="duration-input" placeholder="0" />
      <span>分</span>
    </div>
  </div>

  <div>
    <div className="flex items-center gap-1 mb-1">
      <label htmlFor="time-no-ai-input" className="text-xs text-primary-500">
        AI未利用時の所要時間
      </label>
      <div className="group relative">
        <Info size={12} className="text-primary-400 cursor-help" />
        <div className="absolute ... hidden group-hover:block ...">
          AIを使わずに同じタスクを実施した場合の想定時間を入力します。時間削減効果の測定に使用されます。
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2 px-3 py-3 bg-primary-50 rounded-lg ...">
      <Clock size={14} className="opacity-60" />
      <input id="time-no-ai-input" placeholder="0" />
      <span className="opacity-60">分</span>
    </div>
  </div>

  <div>
    <label htmlFor="rework-count-input" className="block text-xs text-primary-500 mb-1">
      手戻り回数
    </label>
    <div className="flex items-center gap-2 px-3 py-3 bg-primary-50 rounded-lg ...">
      <RotateCcw size={14} />
      <input id="rework-count-input" placeholder="0" />
      <span>回</span>
    </div>
  </div>
</div>
```

---

### 4. 再利用する既存機能・パターン

#### 4.1 ラベルスタイル

- 出典: `SettingsModal.tsx` の既存パターン
- クラス名: `text-xs text-primary-500 mb-1`

#### 4.2 ツールチップパターン

- 出典: `TaskForm.tsx` 198-241行目（AIツール選択）
- コンポーネント: `<Info />` アイコン + `group relative` パターン
- クラス名: `hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10`

#### 4.3 レスポンシブグリッド

- Tailwind のブレークポイント: `sm:` (640px)
- パターン: `grid-cols-1 sm:grid-cols-3`

---

### 5. 検証方法

#### 5.1 ビルド確認

```bash
npm run build
```

- TypeScript エラーがないこと
- ビルドが正常完了すること

#### 5.2 開発サーバーでの動作確認

```bash
npm run dev
```

**確認項目**:

1. **デスクトップ表示** (画面幅 ≥ 640px)
   - [ ] 3つの入力欄が横並びで表示される
   - [ ] 各ラベルが入力欄の上に表示される
   - [ ] 「AI未利用時の所要時間」のラベル横に Info アイコンが表示される
   - [ ] Info アイコンにホバーするとツールチップが表示される

2. **モバイル表示** (画面幅 < 640px)
   - [ ] 3つの入力欄が縦積みで表示される
   - [ ] 各ラベルが見やすく表示される
   - [ ] スクロールなしで全体が確認できる

3. **入力動作**
   - [ ] 数値入力が正常に動作する
   - [ ] フォーカス時にリング（focus-within:ring-2）が表示される
   - [ ] バリデーション（必須項目）が機能する

4. **アクセシビリティ**
   - [ ] Tab キーで各入力欄を順に移動できる
   - [ ] ラベルをクリックすると対応する入力欄にフォーカスされる
   - [ ] スクリーンリーダーでラベルが読み上げられる（確認可能な場合）

#### 5.3 E2Eテスト

```bash
npm run test
```

- [ ] 既存のテストが壊れていないこと

---

### 6. 期待される改善効果

1. **UX向上**: ラベルにより何を入力すべきか直感的に理解可能
2. **モバイル対応**: スマートフォンでの操作性が向上
3. **アクセシビリティ**: スクリーンリーダーやキーボード操作での利便性向上
4. **一貫性**: 既存の SettingsModal などのパターンとの統一

---

### 7. 注意事項

- ツールチップはタッチデバイスではホバー不可のため、ラベルテキスト自体である程度意味が分かるように配慮
- z-index は `z-10` を使用し、他の要素に隠れないようにする
- 「AI未利用時の所要時間」は長いテキストだが、`text-xs` で小さいフォントサイズを使用してスペースを確保
