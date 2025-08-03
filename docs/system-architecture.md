# システム構成図と統合アーキテクチャ

## 1. 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                   フロントエンド (React)                   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │画像表示Canvas│  │ 選択ツール   │  │ 分析パネル    │ │
│  │             │  │ ・手動選択   │  │ ・比率表示    │ │
│  │             │  │ ・自動検出   │  │ ・スコア表示  │ │
│  └─────────────┘  └──────────────┘  └───────────────┘ │
│                           ↓                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              状態管理 (Redux/Zustand)             │   │
│  │  ・選択領域データ  ・検出結果  ・分析結果       │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────┘
                              │ HTTP/WebSocket
                              ↓
┌─────────────────────────────────────────────────────────┐
│                   バックエンド (FastAPI)                  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  APIルーター │  │ 検出サービス │  │ 分析サービス  │ │
│  │             │  │              │  │               │ │
│  │ /detect/*   │  │ MediaPipe    │  │ 比率計算      │ │
│  │ /analyze/*  │  │ OpenCV       │  │ 統計処理      │ │
│  └─────────────┘  └──────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 2. 詳細な統合フロー

### 2.1 手動選択モード（既存機能）
```
ユーザー操作
    ↓
1. 画像アップロード
2. マウスドラッグで親要素選択
3. 親要素内で子要素選択
4. リアルタイム比率計算（フロントエンド）
    ↓
結果表示
```

### 2.2 自動検出モード（新機能）
```
ユーザー操作
    ↓
1. 画像アップロード
2. 「自動検出」ボタンクリック
3. バックエンドAPI呼び出し
    ↓
バックエンド処理
    ↓
4. MediaPipeで検出
5. 座標データ変換
6. フロントエンドに返却
    ↓
フロントエンド処理
    ↓
7. 検出結果を選択領域に変換
8. 既存の比率計算ロジックを適用
9. 統合された結果を表示
```

## 3. データフローと変換

### 3.1 バックエンド → フロントエンド変換
```python
# バックエンド: MediaPipe座標 (0-1の正規化座標)
mediapipe_result = {
    "landmarks": [
        {"x": 0.5, "y": 0.3},  # 鼻先
        {"x": 0.45, "y": 0.25}, # 左目
        # ...
    ]
}

# 変換処理
def convert_to_frontend_format(mediapipe_result, image_dimensions):
    parent_bounds = calculate_face_bounds(mediapipe_result)
    
    return {
        "parent": {
            "x": parent_bounds.x * image_dimensions.width,
            "y": parent_bounds.y * image_dimensions.height,
            "width": parent_bounds.width * image_dimensions.width,
            "height": parent_bounds.height * image_dimensions.height,
            "rotation": 0  # 顔の傾き検出から計算可能
        },
        "children": [
            {
                "name": "左目",
                "bounds": convert_part_bounds("left_eye", mediapipe_result),
                "autoDetected": True
            },
            # ...
        ]
    }
```

### 3.2 フロントエンド統合
```javascript
// 既存の選択領域管理システム
class RegionManager {
    constructor() {
        this.parentRegion = null;
        this.childRegions = [];
    }
    
    // 手動選択（既存）
    addManualRegion(bounds) {
        this.childRegions.push({
            bounds: bounds,
            autoDetected: false
        });
        this.calculateRatios();
    }
    
    // 自動検出結果の統合（新規）
    importDetectionResults(detectionData) {
        // 親要素の設定
        this.parentRegion = detectionData.parent;
        
        // 子要素の追加
        detectionData.children.forEach(child => {
            this.childRegions.push({
                ...child,
                autoDetected: true
            });
        });
        
        // 既存の比率計算を実行
        this.calculateRatios();
    }
    
    // 比率計算（既存ロジックを活用）
    calculateRatios() {
        // 既存の計算ロジックがそのまま使える
        this.childRegions.forEach(child => {
            child.ratios = this.computeRatios(child, this.parentRegion);
        });
    }
}
```

## 4. API設計

### 4.1 エンドポイント構成
```
POST /api/detect/face
  - 顔検出専用
  - レスポンス: 顔全体 + パーツ座標

POST /api/detect/pose  
  - 人体検出専用
  - レスポンス: 肩、肘などの座標

POST /api/detect/auto
  - 画像内容を自動判別して適切な検出
  
POST /api/analyze/ratios
  - 選択領域データから詳細分析
  - 黄金比、対称性などの計算

GET /api/templates
  - 分析テンプレートの取得
```

### 4.2 WebSocket対応（オプション）
```javascript
// リアルタイム検出用
ws.send({
    type: 'detect',
    image: frameData,
    mode: 'face'
});

ws.onmessage = (event) => {
    const detection = JSON.parse(event.data);
    updateRegions(detection);
};
```

## 5. 状態管理の統合

### 5.1 統合されたState構造
```typescript
interface AppState {
    // 画像関連
    image: {
        url: string;
        dimensions: { width: number; height: number };
    };
    
    // 選択領域（手動・自動共通）
    regions: {
        parent: Region | null;
        children: ChildRegion[];
    };
    
    // 検出結果（自動検出用）
    detections: {
        raw: MediaPipeResult | null;
        processed: ProcessedDetection | null;
    };
    
    // 分析結果
    analysis: {
        ratios: RatioAnalysis;
        scores: AnalysisScores;
    };
    
    // UI状態
    ui: {
        mode: 'manual' | 'auto';
        selectedTool: 'select' | 'rotate';
        showGrid: boolean;
    };
}
```

### 5.2 アクション統合
```javascript
// 統一されたアクション
const actions = {
    // 手動操作
    manualSelectParent: (bounds) => { /* ... */ },
    manualSelectChild: (bounds) => { /* ... */ },
    
    // 自動検出
    requestAutoDetection: async (image) => {
        const result = await detectAPI.detect(image);
        dispatch(setDetectionResult(result));
        dispatch(convertToRegions(result));
    },
    
    // 共通操作
    updateRegion: (id, updates) => { /* ... */ },
    calculateAnalysis: () => { /* ... */ },
};
```

## 6. パフォーマンス最適化

### 6.1 キャッシュ戦略
```javascript
// 検出結果のキャッシュ
const detectionCache = new Map();

async function detectWithCache(imageHash) {
    if (detectionCache.has(imageHash)) {
        return detectionCache.get(imageHash);
    }
    
    const result = await api.detect(image);
    detectionCache.set(imageHash, result);
    return result;
}
```

### 6.2 遅延ローディング
```javascript
// MediaPipeモデルの遅延ロード
let detectionService = null;

async function ensureDetectionService() {
    if (!detectionService) {
        const { DetectionService } = await import('./detection');
        detectionService = new DetectionService();
    }
    return detectionService;
}
```

## 7. エラーハンドリング

### 7.1 検出失敗時のフォールバック
```javascript
async function detectWithFallback(image) {
    try {
        // 自動検出を試行
        const result = await api.detectFace(image);
        return { success: true, data: result };
    } catch (error) {
        // 失敗時は手動モードへ
        return {
            success: false,
            fallback: 'manual',
            message: '顔が検出できませんでした。手動で選択してください。'
        };
    }
}
```

### 7.2 部分的な検出結果の処理
```javascript
function processPartialDetection(detection) {
    // 一部のパーツのみ検出された場合
    const detected = detection.parts.filter(p => p.confidence > 0.5);
    const missing = ['eye_left', 'eye_right', 'mouth'].filter(
        required => !detected.find(d => d.name === required)
    );
    
    if (missing.length > 0) {
        console.warn(`未検出: ${missing.join(', ')}`);
        // UIで未検出部分の手動選択を促す
    }
    
    return detected;
}
```

## 8. デプロイメント構成

### 8.1 Docker構成
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://backend:8000
  
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./models:/app/models
    environment:
      - MODEL_PATH=/app/models
```

### 8.2 スケーラビリティ考慮
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │     │ Frontend │     │ Frontend │
└─────┬────┘     └─────┬────┘     └─────┬────┘
      │                │                │
      └────────────────┴────────────────┘
                       │
                 ┌─────┴─────┐
                 │   Nginx   │
                 │(ロードバランサ)│
                 └─────┬─────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    ┌────┴────┐                ┌────┴────┐
    │Backend 1│                │Backend 2│
    └─────────┘                └─────────┘
```