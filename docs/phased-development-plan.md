# 段階的開発計画書

## Phase 1: フロントエンドのみの手動分析アプリ

### 1.1 開発スコープ
**含まれる機能**
- 画像アップロード（ドラッグ&ドロップ）
- 親要素の手動選択（回転機能付き）
- 子要素の手動選択（複数可）
- グリッド表示（16x16、32x32）
- リアルタイム比率計算
- 座標・比率データの表示
- データエクスポート（JSON/CSV）

**技術スタック**
```
- React.js
- Canvas API（画像描画）
- 状態管理: Zustand（軽量でシンプル）
- スタイリング: Tailwind CSS
- ビルドツール: Vite
```

### 1.2 プロジェクト構造
```
frontend-only/
├── src/
│   ├── components/
│   │   ├── ImageCanvas.jsx      # メイン描画エリア
│   │   ├── SelectionTools.jsx   # 選択ツールバー
│   │   ├── RegionList.jsx       # 選択領域リスト
│   │   ├── RatioDisplay.jsx     # 比率表示パネル
│   │   └── ExportPanel.jsx      # エクスポート機能
│   ├── hooks/
│   │   ├── useImageLoad.js      # 画像読み込み
│   │   ├── useSelection.js      # 選択操作
│   │   └── useCalculation.js    # 比率計算
│   ├── utils/
│   │   ├── geometry.js          # 座標計算
│   │   ├── ratioCalculator.js   # 比率計算ロジック
│   │   └── exportHelpers.js     # データ出力
│   └── store/
│       └── appStore.js          # Zustand store
├── public/
└── package.json
```

### 1.3 コア実装
```javascript
// 選択領域の管理（store/appStore.js）
import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  image: null,
  parentRegion: null,
  childRegions: [],
  gridType: '16x16',
  
  setParentRegion: (region) => set({ 
    parentRegion: region,
    childRegions: [] // 親変更時に子をクリア
  }),
  
  addChildRegion: (region) => set((state) => ({
    childRegions: [...state.childRegions, {
      ...region,
      id: Date.now(),
      ratios: calculateRatios(region, state.parentRegion)
    }]
  })),
  
  rotateParent: (angle) => set((state) => ({
    parentRegion: { ...state.parentRegion, rotation: angle }
  }))
}));
```

### 1.4 デプロイメント
- GitHub Pages（静的ホスティング）
- Netlify/Vercel（より高機能）
- ローカル実行用のビルド

## Phase 2: バックエンド統合版（自動検出機能付き）

### 2.1 移行戦略
**コードの再利用**
```javascript
// Phase 1のコンポーネントをそのまま活用
import { ImageCanvas } from './phase1/components/ImageCanvas';
import { RatioDisplay } from './phase1/components/RatioDisplay';

// 新規追加コンポーネント
import { AutoDetectPanel } from './components/AutoDetectPanel';
import { AnalysisMode } from './components/AnalysisMode';
```

### 2.2 追加プロジェクト構造
```
fullstack-app/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── [Phase1のコンポーネント]
│   │   │   ├── AutoDetectPanel.jsx   # 新規
│   │   │   └── AnalysisReport.jsx    # 新規
│   │   ├── services/
│   │   │   └── detectionAPI.js       # バックエンド通信
│   │   └── store/
│   │       └── appStore.js           # 拡張版
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI
│   │   ├── routers/
│   │   │   └── detection.py
│   │   └── services/
│   │       ├── face_detection.py
│   │       └── pose_detection.py
│   └── requirements.txt
└── docker-compose.yml
```

### 2.3 移行時の変更点
```javascript
// Phase 1のstore
const useAppStore = create((set) => ({
  parentRegion: null,
  childRegions: [],
  // ... 既存の機能
}));

// Phase 2で拡張
const useAppStore = create((set) => ({
  parentRegion: null,
  childRegions: [],
  detectionMode: 'manual', // 新規追加
  isDetecting: false,      // 新規追加
  
  // 既存の機能はそのまま維持
  setParentRegion: (region) => { /* ... */ },
  
  // 新規追加メソッド
  detectRegions: async (image) => {
    set({ isDetecting: true });
    const results = await detectionAPI.detect(image);
    set({ 
      parentRegion: results.parent,
      childRegions: results.children,
      isDetecting: false
    });
  }
}));
```

## 3. 開発の利点

### 3.1 Phase 1の利点
- **即座に使用可能**: サーバー不要で配布も簡単
- **プライバシー完全保護**: すべてブラウザ内で完結
- **開発速度**: バックエンドの考慮不要で高速開発
- **学習曲線**: フロントエンドに集中して習得

### 3.2 Phase 2への移行利点
- **コード資産の活用**: Phase 1の90%以上を再利用
- **段階的な複雑性**: 基礎が固まってから高度な機能
- **ユーザーフィードバック**: Phase 1の使用感を Phase 2に反映
- **リスク分散**: 基本機能の動作を確保してから拡張

## 4. 技術的な配慮事項

### 4.1 Phase 1 → Phase 2の互換性
```javascript
// データ構造を最初から考慮
const regionData = {
  bounds: { x, y, width, height },
  rotation: 0,
  autoDetected: false, // Phase 2で true になる
  confidence: null,    // Phase 2で使用
  source: 'manual'     // 'manual' | 'auto'
};
```

### 4.2 設定の外部化
```javascript
// config.js - Phase 2で簡単に切り替え
export const config = {
  enableAutoDetection: false, // Phase 2で true
  apiEndpoint: null,          // Phase 2で設定
  maxImageSize: 4096,
  defaultGridSize: 16
};
```

## 5. 開発タイムライン案

### Phase 1（2-3週間）
- Week 1: 基本UI、画像表示、選択機能
- Week 2: 回転機能、比率計算、グリッド
- Week 3: データ出力、UI改善、テスト

### Phase 2（3-4週間）
- Week 1: バックエンドAPI構築
- Week 2: フロントエンド統合
- Week 3: 分析機能追加
- Week 4: 最適化、テスト

## 6. 成果物

### Phase 1 完了時
- スタンドアロンWebアプリ
- ユーザーマニュアル
- デモサイト（GitHub Pages）
- ソースコード（再利用可能）

### Phase 2 完了時
- フルスタックアプリ
- APIドキュメント
- Docker構成
- 本番環境デプロイ手順