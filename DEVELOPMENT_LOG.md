# Object Proportion Analysis App - Development Log

## プロジェクト概要
画像内のオブジェクトの比率と位置関係を視覚的に分析し、数値データとして取得するためのWebアプリケーション。

## 技術スタック
- React 19 + TypeScript
- Tailwind CSS v3.4 (Minimal styling approach)
- HTML5 Canvas API
- Vite (build tool)

## 実装完了機能 ✅

### 1. 基本インフラ (2025-01-03)
- ✅ プロジェクトセットアップ
- ✅ TypeScript設定
- ✅ Tailwind CSS設定
- ✅ ESLint設定

### 2. コードリファクタリング (2025-01-03)
- ✅ useImageCanvas hookの分割
  - `useCanvasDrawing` - 描画操作
  - `useCanvasInteraction` - マウスイベント
  - `useImageLoader` - 画像読み込み
- ✅ App.tsxの状態管理分離
  - `useAnalysisData` - 分析データ管理
  - `useImageHandling` - 画像処理とUI状態
  - `useExport` - エクスポート機能
- ✅ 定数ファイル作成 (`src/utils/constants.ts`)

### 3. 核心機能実装 (2025-01-03)
- ✅ **親フレーム作成機能**
  - マウスドラッグによる四角形描画
  - リサイズハンドル対応
  - 位置移動対応

- ✅ **回転機能**
  - 回転ハンドル（選択枠外側上部）
  - リアルタイム角度変更
  - スナップ機能（0°、45°、90°等）

- ✅ **ズーム機能**
  - マウスホイールでのズーム（10%-500%）
  - ズーム中心点の制御
  - ズームコントロールUI

- ✅ **パン機能**
  - Space+ドラッグでのパン操作
  - 中マウスボタンでのパン対応
  - 選択操作との競合回避

### 4. 座標系統合 (2025-01-03)
- ✅ **ズームと座標変換の統合**
  - Canvas内部座標系とCSS表示座標系の統一
  - マウス座標の正確な変換
  - 描画時の変換適用

- ✅ **描画位置修正**
  - ドラッグ中のフレーム描画位置修正
  - グリッドオーバーレイ位置修正
  - 一時的な描画での変換適用

### 5. 基本UI機能
- ✅ 画像アップロード（ドラッグ&ドロップ、ファイル選択）
- ✅ グリッド表示（16x16、32x32、カスタム）
- ✅ 子領域選択（複数選択対応）
- ✅ データエクスポート（JSON、CSV）
- ✅ サイドパネル（分析結果表示）

## 実装中/未実装機能 🔶

### 中優先度
1. **Grid座標系の改善**
   - 現在: 左上原点
   - 要件: 親要素の中心を原点(0,0)とする座標系
   - 実装箇所: `src/utils/geometry.ts`の`convertToGridCoordinates`

2. **子領域の名前編集機能**
   - 現在: 自動命名（Region 1, Region 2...）
   - 要件: ユーザーが任意の名前を設定可能
   - 実装箇所: `src/components/SidePanel.tsx`

3. **URL画像読み込み機能**
   - 現在: ファイルアップロードのみ
   - 要件: URLからの画像読み込み
   - 実装箇所: `src/components/ImageUploader.tsx`

### 低優先度
4. **基本キーボードショートカット**
   - Deleteキーでの領域削除
   - 実装箇所: 新規hook `useKeyboardShortcuts`

5. **Undo/Redo機能**
   - 実装箇所: 新規hook `useHistory`

6. **親要素外の子要素の距離計算**
   - 現在: 基本的な外部判定のみ
   - 要件: 最短距離と方向の詳細計算

## ファイル構造

```
src/
├── types/
│   └── index.ts                 # 型定義
├── utils/
│   ├── constants.ts             # 定数定義 ✅
│   ├── geometry.ts              # 幾何計算
│   └── export.ts                # エクスポート機能
├── hooks/
│   ├── useAnalysisData.ts       # 分析データ管理 ✅
│   ├── useImageHandling.ts      # 画像処理 ✅
│   ├── useExport.ts             # エクスポート ✅
│   ├── useImageCanvas.ts        # Canvas統合 ✅
│   ├── useCanvasDrawing.ts      # 描画機能 ✅
│   ├── useCanvasInteraction.ts  # マウス操作 ✅
│   ├── useCanvasZoom.ts         # ズーム/パン ✅
│   └── useImageLoader.ts        # 画像読み込み ✅
├── components/
│   ├── ImageUploader.tsx        # 画像アップロード
│   ├── ImageCanvas.tsx          # メインCanvas ✅
│   ├── GridOverlay.tsx          # グリッド表示 ✅
│   ├── Toolbar.tsx              # ツールバー
│   ├── SidePanel.tsx            # サイドパネル
│   └── CoordinateDisplay.tsx    # 座標表示
└── App.tsx                      # メインアプリ ✅
```

## 次回開始時の推奨タスク

### 1. Grid座標系の改善（推奨：最優先）
**目的**: 要件書通りの中心原点座標系実装
**実装場所**: `src/utils/geometry.ts`
**変更点**:
```typescript
// 現在: convertToGridCoordinates(point, parent, gridSize)
// 変更後: 親要素中心を(0,0)とする座標系
const gridX = Math.floor((point.x - parent.x - parent.width/2) / cellWidth);
const gridY = Math.floor((point.y - parent.y - parent.height/2) / cellHeight);
```

### 2. 子領域名前編集機能（推奨：次点）
**目的**: UX向上
**実装場所**: `src/components/SidePanel.tsx`
**追加機能**:
- インライン編集可能なテキストフィールド
- Enter/Escapeキーでの確定/キャンセル
- 重複名のバリデーション

### 3. URL画像読み込み機能
**目的**: 機能拡張
**実装場所**: `src/components/ImageUploader.tsx`
**追加UI**: URL入力フィールドとLoad Imageボタン

## 重要な技術的注意点

### Canvas座標変換
- Canvas内部座標とCSS表示座標は区別する
- ズーム/パン時は`ctx.translate()`と`ctx.scale()`で変換適用
- マウス座標は`screenToCanvas`関数で正確に変換

### 状態管理パターン
- 機能別にカスタムhookで分離
- `useCallback`でパフォーマンス最適化
- 型安全性を重視（any型禁止）

### ビルド/テストコマンド
```bash
npm run dev      # 開発サーバー
npm run build    # TypeScript型チェック + ビルド
npm run lint     # ESLintチェック
```

## トラブルシューティング

### よくある問題
1. **座標がずれる**: `screenToCanvas`の変換確認
2. **描画が見えない**: `ctx.save()`/`ctx.restore()`の対応確認
3. **型エラー**: `CLAUDE.md`の型チェックコマンド実行

---
**最終更新**: 2025-01-03
**次回開始推奨**: Grid座標系の中心原点実装