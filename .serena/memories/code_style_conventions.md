# Code Style and Conventions

## Language and Naming
- **English Only**: All UI text, code comments, and documentation must be in English
- **PascalCase**: React components and TypeScript interfaces/types
- **camelCase**: Variables, functions, and utility files
- **File Naming**: PascalCase for components, camelCase for utilities

## TypeScript Standards
- **Strict Mode**: All strict TypeScript options enabled
- **No any Type**: Explicit typing required, any type forbidden
- **Type Safety**: Comprehensive type definitions in `src/types/`
- **Interface Definitions**: Clear interfaces for all data structures

## React Patterns
- **Functional Components**: Use function declarations, not arrow functions for components
- **Custom Hooks**: Extract reusable logic into custom hooks
- **useCallback**: Optimize performance with useCallback for event handlers
- **State Management**: useState for local state, props for data flow

## CSS and Styling
- **Tailwind CSS**: Use minimal styling classes only
- **Minimal Design**: Clean, simple, functional interface
- **Neutral Colors**: Grays and blues, minimal color usage
- **Clean Spacing**: Consistent borders and spacing patterns

## Code Organization
- **Single Responsibility**: Each component has a clear, focused purpose
- **Type-First**: Define types before implementation
- **Import Organization**: Group imports by type (React, types, utils, components)
- **Export Patterns**: Named exports for utilities, default exports for components