# Suggested Commands for Development

## Development Commands
```bash
# Start development server
npm run dev

# Build project (includes TypeScript compilation and type checking)
npm run build

# Type checking only (without build)
npm run typecheck

# Lint code
npm run lint

# Preview built application
npm run preview
```

## Essential Development Workflow
1. **After implementing features**: Always run `npm run build` and `npm run lint`
2. **Before committing**: Ensure both type checking and linting pass
3. **Error handling**: Fix both errors and warnings when possible

## System Commands (macOS/Darwin)
```bash
# File operations
ls -la          # List files with details
find . -name    # Find files by name
grep -r         # Search in files

# Git operations
git status      # Check repository status
git add .       # Stage changes
git commit -m   # Commit changes

# Process management
ps aux          # List running processes
kill -9 <pid>   # Force kill process
```

## Project-Specific Commands
- **Port**: Development server typically runs on port 5173
- **Build Output**: Located in `dist/` directory
- **Source Maps**: Available in development mode
- **Hot Module Replacement**: Enabled by default with Vite