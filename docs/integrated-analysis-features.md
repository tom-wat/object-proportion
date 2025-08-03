# 統合分析機能 仕様書

## 1. 自動検出＋比率分析の統合機能

### 1.1 顔分析テンプレート
**自動生成される分析項目**
```
顔検出実行時に自動的に以下を計算：
- 顔の黄金比分析
  - 顔の縦横比（理想: 1:1.618）
  - 額：鼻：顎の比率（理想: 1:1:1）
  - 目の幅：目の間隔（理想: 1:1）
  
- パーツ配置分析
  - 顔幅に対する目の位置（理想: 左右から1/5の位置）
  - 顔の高さに対する目の位置（理想: 中央）
  - 口の幅と目の幅の比率
  
- 対称性分析
  - 左右の目の高さのズレ
  - 口角の左右バランス
  - 顔の中心軸からのズレ
```

### 1.2 体型分析テンプレート
**肩幅基準の分析**
```
- 頭身比率（肩幅に対する頭の大きさ）
- 肩幅と腰幅の比率
- 腕の長さ（肩から手首）と身長の比率
- ポーズの対称性分析
```

## 2. 分析レポート機能

### 2.1 ビジュアルレポート
```javascript
{
  "analysisReport": {
    "type": "face_analysis",
    "timestamp": "2025-08-02T10:30:00",
    "measurements": {
      "goldenRatio": {
        "faceRatio": {
          "actual": 1.55,
          "ideal": 1.618,
          "deviation": -4.1
        },
        "verticalThirds": {
          "forehead": 33.5,
          "nose": 31.2,
          "chin": 35.3,
          "balance": "良好"
        }
      },
      "symmetry": {
        "score": 92.5,
        "details": {
          "eyeLevel": "左が2px高い",
          "mouthBalance": "ほぼ対称"
        }
      }
    },
    "visualizations": [
      "golden_ratio_grid.png",
      "symmetry_lines.png"
    ]
  }
}
```

### 2.2 比較分析機能
**複数画像の比較**
- Before/After分析
- 時系列変化の追跡
- 理想比率との差異表示

## 3. UI/UX改善案

### 3.1 ワンクリック分析
```
[顔写真をアップロード]
    ↓
[顔分析モード] ボタンをクリック
    ↓
自動的に：
1. 顔検出
2. 主要パーツをすべて検出
3. 親要素として顔全体を設定
4. 子要素として目、鼻、口などを設定
5. 比率計算と分析レポート生成
```

### 3.2 インタラクティブな調整
- 自動検出結果の手動微調整
- リアルタイムで比率が更新
- 理想値との差をビジュアル表示

### 3.3 プリセットテンプレート
**用途別テンプレート**
```
- ポートレート分析
  - 顔の黄金比
  - 表情の対称性
  - メイクアップガイド

- デザイン分析
  - UI要素の配置バランス
  - ロゴの比率チェック
  - レイアウトグリッド

- 人体分析
  - 姿勢チェック
  - 体型バランス
  - スポーツフォーム分析
```

## 4. 実装例

### 4.1 自動分析フロー
```python
class IntegratedAnalyzer:
    def analyze_face(self, image):
        # 1. 顔検出
        face_landmarks = self.detect_face(image)
        
        # 2. 親要素（顔全体）の設定
        face_bounds = self.calculate_face_bounds(face_landmarks)
        parent_region = self.create_parent_region(face_bounds)
        
        # 3. 子要素（パーツ）の自動設定
        child_regions = []
        for part_name, indices in FACE_PARTS_INDICES.items():
            part_bounds = self.get_part_bounds(face_landmarks, indices)
            child_regions.append({
                'name': part_name,
                'bounds': part_bounds,
                'autoDetected': True
            })
        
        # 4. 比率分析
        analysis_result = self.calculate_ratios(parent_region, child_regions)
        
        # 5. レポート生成
        report = self.generate_report(analysis_result)
        
        return {
            'regions': {'parent': parent_region, 'children': child_regions},
            'analysis': analysis_result,
            'report': report
        }
```

### 4.2 フロントエンド統合
```javascript
// 分析モードの切り替え
function enableAnalysisMode(type) {
  switch(type) {
    case 'face':
      // 顔分析用のUIを表示
      showFaceAnalysisPanel();
      loadFaceTemplates();
      break;
    case 'pose':
      // 体型分析用のUIを表示
      showPoseAnalysisPanel();
      loadPoseTemplates();
      break;
    case 'custom':
      // カスタム分析モード
      showCustomPanel();
      break;
  }
}

// 分析結果の可視化
function visualizeAnalysis(results) {
  // 理想比率をオーバーレイ表示
  drawGoldenRatioGrid(results.goldenRatio);
  
  // 差異を色分けで表示
  highlightDeviations(results.deviations);
  
  // スコアをグラフで表示
  renderScoreChart(results.scores);
}
```

## 5. データエクスポート拡張

### 5.1 分析レポート形式
```json
{
  "exportData": {
    "rawMeasurements": {...},  // 従来の座標データ
    "analysisResults": {
      "ratios": {
        "faceWidth_to_eyeDistance": 2.8,
        "eyeWidth_to_mouthWidth": 0.45
      },
      "scores": {
        "goldenRatio": 85,
        "symmetry": 92,
        "overall": 88.5
      },
      "recommendations": [
        "顔の縦横比は理想に近い",
        "左右の目の高さに若干の差があります"
      ]
    },
    "comparisonData": {
      "idealValues": {...},
      "actualValues": {...},
      "deviations": {...}
    }
  }
}
```

### 5.2 ビジュアルエクスポート
- 分析結果を重ねた画像
- 比率を表示したPDF
- インタラクティブHTML レポート

## 6. 今後の拡張可能性

### 6.1 AI提案機能
- 理想的な比率に近づけるための提案
- 自動補正機能
- スタイル別の最適化

### 6.2 3D分析
- 深度情報を使った立体分析
- 横顔と正面の統合分析
- 動画での動的分析

### 6.3 機械学習統合
- ユーザーの好みを学習
- カスタム美的基準の作成
- 業界別の標準値設定