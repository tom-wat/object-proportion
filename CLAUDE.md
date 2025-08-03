# Claude Development Guidelines

## Code Quality Standards

### Type Checking and Linting
機能実装のたびに以下のコマンドを必ず実行する：

```bash
# Type checking
npm run build

# Linting
npm run lint
```

### Development Workflow
1. 機能実装後、必ずtype checkとlintを実行
2. エラーがある場合は修正してから次の機能に進む
3. 警告レベルのエラーも可能な限り修正する
4. コミット前には必ず両方のチェックをパスすること

### UI/UX Guidelines
- **Minimal Design**: Clean, simple, and functional interface
- **English Only**: All text, labels, and messages must be in English
- **Tailwind CSS**: Use minimal styling classes, prefer subtle borders and clean spacing
- **Color Palette**: Use neutral grays, blues for primary actions, minimal color usage
- **Typography**: Clean, readable fonts with consistent sizing

### Commands Reference
- `npm run dev` - 開発サーバー起動
- `npm run build` - TypeScriptコンパイル（型チェック含む）
- `npm run typecheck` - TypeScript型チェックのみ
- `npm run lint` - ESLintチェック
- `npm run preview` - ビルド後のプレビュー

### Project Structure
```
src/
├── types/           # 型定義
├── utils/           # ユーティリティ関数
├── hooks/           # カスタムフック
├── components/      # Reactコンポーネント
└── App.tsx          # メインアプリケーション
```

### Technology Stack
- React 19 + TypeScript
- Tailwind CSS v3.4 (Minimal styling approach)
- HTML5 Canvas API
- Vite (build tool)

### Code Style Guidelines
- 関数型コンポーネントを使用
- useCallbackでパフォーマンス最適化
- 型安全性を重視（any型の使用禁止）
- Tailwind CSSクラスでスタイリング（ミニマルデザイン）
- ファイル名はPascalCase（コンポーネント）またはcamelCase（ユーティリティ）
- **ALL TEXT IN ENGLISH**: UI labels, messages, comments in code