# 自動検出機能 技術仕様書

## 1. 検出可能な要素（2025年現在）

### 1.1 顔関連パーツ
**MediaPipe Face Mesh**
- 468個の顔ランドマーク検出
- 検出可能な部位：
  - 目（左右、上瞼、下瞼、目尻、目頭）
  - 眉毛（左右、各8点）
  - 鼻（鼻先、鼻翼、鼻筋）
  - **口**（上唇、下唇、口角、輪郭全体）
  - 顎ライン
  - 額
- リアルタイム処理可能（30fps以上）
- 精度: 非常に高い

### 1.2 人体パーツ
**MediaPipe Pose**
- 33個の人体キーポイント検出
- 検出可能な部位：
  - **肩**（左右）
  - 肘（左右）
  - 手首（左右）
  - 腰（左右）
  - 膝（左右）
  - 足首（左右）
- 3D座標も取得可能
- 精度: 高い

**OpenPose**
- より詳細な135点検出（全身+手+顔）
- MediaPipeより重いが高精度

### 1.3 手の詳細
**MediaPipe Hands**
- 21個の手のランドマーク
- 各指の関節を個別に検出

## 2. 推奨実装構成

### 2.1 技術スタック
```
フロントエンド（既存）
    ↓
FastAPI バックエンド
    ├── MediaPipe（メイン検出エンジン）
    ├── OpenCV（前処理・後処理）
    └── NumPy（座標計算）
```

### 2.2 API設計
```python
# エンドポイント例
POST /api/detect/face
POST /api/detect/pose
POST /api/detect/custom

# リクエスト
{
  "image": "base64_encoded_image",
  "detection_types": ["face_landmarks", "pose"],
  "options": {
    "min_detection_confidence": 0.5,
    "return_format": "normalized"  # or "pixel"
  }
}

# レスポンス
{
  "detections": {
    "face": {
      "landmarks": {
        "mouth_upper_lip": {"x": 0.5, "y": 0.6},
        "mouth_lower_lip": {"x": 0.5, "y": 0.65},
        "mouth_left_corner": {"x": 0.45, "y": 0.62},
        "mouth_right_corner": {"x": 0.55, "y": 0.62}
      },
      "bounding_box": {...}
    },
    "pose": {
      "landmarks": {
        "left_shoulder": {"x": 0.4, "y": 0.3, "z": 0.1},
        "right_shoulder": {"x": 0.6, "y": 0.3, "z": 0.1}
      }
    }
  }
}
```

## 3. 実装例

### 3.1 バックエンド実装
```python
import mediapipe as mp
from fastapi import FastAPI, UploadFile
import cv2
import numpy as np
import base64

app = FastAPI()

# MediaPipe初期化
mp_face_mesh = mp.solutions.face_mesh
mp_pose = mp.solutions.pose

face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    min_detection_confidence=0.5
)

pose = mp_pose.Pose(
    static_image_mode=True,
    min_detection_confidence=0.5
)

@app.post("/api/detect/face")
async def detect_face(file: UploadFile):
    # 画像読み込み
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # 検出実行
    results = face_mesh.process(rgb_image)
    
    if results.multi_face_landmarks:
        landmarks = results.multi_face_landmarks[0]
        
        # 特定パーツの抽出（口の例）
        mouth_landmarks = {
            "upper_lip_top": landmarks.landmark[13],
            "lower_lip_bottom": landmarks.landmark[17],
            "mouth_left": landmarks.landmark[61],
            "mouth_right": landmarks.landmark[291]
        }
        
        # 座標を正規化された形式で返す
        return {
            "mouth": {
                "upper_lip": {
                    "x": mouth_landmarks["upper_lip_top"].x,
                    "y": mouth_landmarks["upper_lip_top"].y
                },
                # ... 他のポイント
            }
        }
```

### 3.2 フロントエンド統合
```javascript
// 既存のアプリケーションに追加
async function detectFeatures(imageFile) {
  const formData = new FormData();
  formData.append('file', imageFile);
  
  const response = await fetch('/api/detect/face', {
    method: 'POST',
    body: formData
  });
  
  const detections = await response.json();
  
  // 検出結果を既存の選択システムに変換
  if (detections.mouth) {
    createChildRegion({
      name: '口',
      bounds: calculateBoundsFromLandmarks(detections.mouth),
      autoDetected: true
    });
  }
}
```

## 4. 主要ランドマークインデックス

### 4.1 MediaPipe Face Mesh - 口周辺
- 13: 上唇の上部中央
- 14: 上唇の下部中央
- 17: 下唇の下部中央
- 18: 下唇の上部中央
- 61: 口の左端（正面から見て）
- 291: 口の右端
- 0-16: 唇の輪郭全体

### 4.2 MediaPipe Pose - 上半身
- 11: 左肩
- 12: 右肩
- 13: 左肘
- 14: 右肘
- 15: 左手首
- 16: 右手首
- 23: 左腰
- 24: 右腰

## 5. 精度とパフォーマンス

### 5.1 検出精度
- **顔ランドマーク**: 95%以上（正面顔）
- **人体ポーズ**: 90%以上（全身が見える場合）
- **横顔・部分的な隠れ**: 70-80%

### 5.2 処理速度
- **CPU処理**: 100-200ms/画像
- **GPU処理**: 20-50ms/画像
- **バッチ処理**: 複数画像を同時処理で効率化可能

## 6. 制限事項と対策

### 6.1 制限事項
- 複数人の同時検出は精度低下
- 極端な角度や照明では検出困難
- 小さすぎる顔（画像の10%未満）は検出不可

### 6.2 対策
- 前処理で画像品質を改善
- 複数モデルの組み合わせ
- ユーザーによる手動補正機能

## 7. 拡張可能性

### 7.1 カスタムモデル追加
- 特定用途向けの学習済みモデル
- YOLOでの物体検出追加
- セグメンテーションモデル統合

### 7.2 リアルタイム処理
- WebRTCでのライブ検出
- 動画ファイルの分析

## 8. プライバシー配慮

### 8.1 データ処理
- 画像は処理後即座に削除
- 検出結果のみを返却
- ログに個人識別情報を残さない

### 8.2 オプトイン
- 自動検出機能はユーザーが明示的に有効化
- 処理内容の透明性確保