# Object Proportion Analysis App - Development Log

## プロジェクト概要

画像内のオブジェクトの比率と位置関係を視覚的に分析し、数値データとして取得するための Web アプリケーション。

## 技術スタック

- React 19 + TypeScript
- Tailwind CSS v3.4 (Minimal styling approach)
- HTML5 Canvas API
- Vite (build tool)

## 実装完了機能 ✅

### 1. 基本インフラ (2025-01-03)

- ✅ プロジェクトセットアップ
- ✅ TypeScript 設定
- ✅ Tailwind CSS 設定
- ✅ ESLint 設定

### 2. コードリファクタリング (2025-01-03)

- ✅ useImageCanvas hook の分割
  - `useCanvasDrawing` - 描画操作
  - `useCanvasInteraction` - マウスイベント
  - `useImageLoader` - 画像読み込み
- ✅ App.tsx の状態管理分離
  - `useAnalysisData` - 分析データ管理
  - `useImageHandling` - 画像処理と UI 状態
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
  - スナップ機能（0°、45°、90° 等）

- ✅ **ズーム機能**

  - マウスホイールでのズーム（10%-500%）
  - ズーム中心点の制御
  - ズームコントロール UI

- ✅ **パン機能**
  - Space+ドラッグでのパン操作
  - 中マウスボタンでのパン対応
  - 選択操作との競合回避

### 4. 座標系統合 (2025-01-03)

- ✅ **ズームと座標変換の統合**

  - Canvas 内部座標系と CSS 表示座標系の統一
  - マウス座標の正確な変換
  - 描画時の変換適用

- ✅ **描画位置修正**
  - ドラッグ中のフレーム描画位置修正
  - グリッドオーバーレイ位置修正
  - 一時的な描画での変換適用

### 5. 基本 UI 機能

- ✅ 画像アップロード（ドラッグ&ドロップ、ファイル選択）
- ✅ グリッド表示（16x16、32x32、カスタム）
- ✅ 子領域選択（複数選択対応）
- ✅ データエクスポート（JSON、CSV）
- ✅ サイドパネル（分析結果表示）

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

### 1. Undo/Redo 機能の改善（推奨：最優先）

**目的**: 移動操作時の履歴記録を最適化
**現状の問題**: 移動中の細かい動きがすべて記録されてしまう
**改善要求**: 一定時間停止した時のみ履歴を記録するように変更
**実装方針**:

- デバウンス機能を追加し、連続する操作を単一の履歴エントリとしてまとめる
- 操作停止後の一定時間（例：500ms）経過時に履歴を確定
  **実装箇所**: 新規 hook `useHistory` + 既存の UndoRedo システム

### 2.グリッド 4x4 の分割線を若干太くする

### 3. Grid 座標系の改善

**目的**: 要件書通りの中心原点座標系実装
**実装場所**: `src/utils/geometry.ts`
**変更点**:

```typescript
// 現在: convertToGridCoordinates(point, parent, gridSize)
// 変更後: 親要素中心を(0,0)とする座標系
const gridX = Math.floor((point.x - parent.x - parent.width / 2) / cellWidth);
const gridY = Math.floor((point.y - parent.y - parent.height / 2) / cellHeight);
```

## 重要な技術的注意点

### Canvas 座標変換

- Canvas 内部座標と CSS 表示座標は区別する
- ズーム/パン時は`ctx.translate()`と`ctx.scale()`で変換適用
- マウス座標は`screenToCanvas`関数で正確に変換

### 状態管理パターン

- 機能別にカスタム hook で分離
- `useCallback`でパフォーマンス最適化
- 型安全性を重視（any 型禁止）

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
**次回開始推奨**: Grid 座標系の中心原点実装
