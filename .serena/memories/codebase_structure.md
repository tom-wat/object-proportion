# Codebase Structure

## Directory Organization
```
object-proportion/
├── src/
│   ├── types/index.ts       # TypeScript type definitions
│   ├── utils/               # Utility functions
│   │   ├── geometry.ts      # Geometric calculations
│   │   └── export.ts        # Data export functionality
│   ├── hooks/               # Custom React hooks
│   │   └── useImageCanvas.ts # Canvas-specific logic
│   ├── components/          # React components
│   │   ├── ImageCanvas.tsx   # Main canvas component
│   │   ├── ImageUploader.tsx # File upload interface
│   │   ├── Toolbar.tsx       # Top toolbar with controls
│   │   ├── SidePanel.tsx     # Right side analysis panel
│   │   ├── GridOverlay.tsx   # Grid overlay component
│   │   └── CoordinateDisplay.tsx # Coordinate display
│   ├── assets/              # Static assets
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── public/                  # Static public assets
├── docs/                    # Documentation
└── CLAUDE.md                # Development guidelines
```

## Key Architecture Patterns
- **Component-Based**: Modular React components with clear responsibilities
- **Type-First**: Comprehensive TypeScript types define data structures
- **Utility-Driven**: Geometric calculations separated into utility functions
- **Hook-Based**: Custom hooks for complex state management
- **Canvas-Centric**: HTML5 Canvas for interactive image manipulation

## Data Flow
1. **Image Upload** → ImageUploader → App state
2. **Region Selection** → ImageCanvas → Geometry utils → App state
3. **Analysis** → SidePanel displays calculated data
4. **Export** → Export utils → JSON/CSV output