# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

umuo.app is a language learning application focused on shadowing practice with AI-powered audio transcription. The application processes audio files, generates transcripts with timestamps, and provides an interactive player for language learning.

## Core Architecture

### Frontend Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **UI**: React 19 + shadcn/ui components + Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: React hooks + TanStack Query for server state
- **Database**: IndexedDB via Dexie (client-side)

### AI Integration
- **Primary**: Groq SDK (direct integration, not via AI SDK) with Whisper-large-v3-turbo for transcription
- **Text Processing**: Groq SDK for text normalization and enhancement via `/api/postprocess`
- **Processing**: Server-side API routes with client-side state management
- **Migration**: Recently migrated from AI SDK to direct Groq SDK for simplified integration and better performance

### Data Flow
```
Audio Upload → Transcription API → Post-processing → IndexedDB Storage → UI State Sync
    ↓              ↓              ↓               ↓              ↓
File Management   AI Services   Text Normalization   Persistent Storage   Real-time Updates
```

### State Management Architecture
- **TanStack Query**: Server state management, caching, and synchronization
- **React Hooks**: Component-level state management
- **IndexedDB**: Persistent client-side storage
- **Real-time Updates**: Automatic UI sync with database changes
- **Repository Pattern**: Clean data access layer with base repository and factory pattern for type-safe database operations

## Available Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm build:analyze    # Build with bundle analyzer
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run Biome.js linter
pnpm format           # Format code with Biome.js
pnpm type-check       # TypeScript type checking

# Testing (Optional Infrastructure)
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once
pnpm test:coverage    # Run tests with coverage report
pnpm test:ui          # Run tests with UI interface

# Deployment (Vercel)
pnpm deploy           # Build and deploy to production
pnpm deploy:preview   # Build and deploy to preview

# CI/Quality Pipeline
pnpm ci:build         # Complete CI pipeline (install, lint, type-check, test, build)
```

## Key Directories

- `/src/app` - Next.js App Router pages and API routes
- `/src/components` - React components organized by feature
- `/src/hooks` - Custom React hooks for state management
- `/src/lib` - Utility functions, database operations, and API clients
- `/src/types` - TypeScript type definitions
- `/src/components/providers` - React providers (QueryProvider, etc.)

## Database Schema

The application uses Dexie (IndexedDB) with the following main tables:
- `files` - Audio file metadata and storage with blob data
- `transcripts` - Transcription status and metadata
- `segments` - Time-coded transcript segments with word timestamps, normalized text, translations, and annotations

**Database Version**: Currently at version 3 with migration support for:
- Enhanced transcription features (normalizedText, translation, annotations, furigana)
- Word timestamps for precise playback synchronization
- Comprehensive indexing for performance optimization

**Database Utilities**: Simplified DBUtils class with batch processing support for large segment datasets

### Repository Pattern Architecture

The application implements a clean Repository Pattern for data access:

```typescript
// Base repository with common CRUD operations
abstract class BaseRepository<T> implements IRepository<T>

// Specific implementations
class FileRepository extends BaseRepository<FileRow>
class TranscriptRepository extends BaseRepository<TranscriptRow>
class SegmentRepository extends BaseRepository<SegmentRow>

// Factory for repository instances
class RepositoryFactory {
  static getFileRepository(): FileRepository
  static getTranscriptRepository(): TranscriptRepository
  static getSegmentRepository(): SegmentRepository
}
```

**Key Features**:
- **Type-safe operations** with TypeScript interfaces
- **Built-in caching** with 5-minute timeout and cache management
- **Batch processing** support for large datasets
- **Query abstraction** with pagination, search, and filtering
- **Health checks** and metrics for monitoring
- **Transaction support** for complex operations

## API Routes Structure

- `/api/transcribe` - Main transcription endpoint using Groq
- `/api/postprocess` - Text normalization and enhancement
- `/api/progress/[fileId]` - Real-time progress tracking

## Component Architecture

### Player Components
- `PlayerPage` - Main player interface with automatic transcription
- `ScrollableSubtitleDisplay` - Time-synced subtitle display with highlighting
- `PlayerFooter` - Audio controls with playback rate and volume

### File Management
- `FileUpload` - Drag-and-drop file upload with validation
- `FileManager` - Simplified file management with search, filtering, and sorting (removed grid/list view toggle)
- `FileCard` - Individual file display with real-time transcription status
- `useFileList` - Custom hook for file filtering, sorting, and selection state management

### Data Management Components
- `QueryProvider` - TanStack Query provider with caching configuration
- `ApiKeyError` - Error handling for missing API keys

## State Management with TanStack Query

### Query Keys Structure
```typescript
export const transcriptionKeys = {
  all: ["transcription"] as const,
  forFile: (fileId: number) => [...transcriptionKeys.all, "file", fileId] as const,
  progress: (fileId: number) => [...transcriptionKeys.forFile(fileId), "progress"] as const,
};
```

### Key Hooks
- `useTranscriptionStatus(fileId)` - Query transcription status for a file
- `useTranscription()` - Mutation for starting transcription
- `usePlayerDataQuery(fileId)` - Complete player data management with auto-transcription
- `useTranscriptionSummary(fileIds)` - Batch status for multiple files
- `useFiles()` - Unified file management with real-time updates
- `useFileStatus(fileId)` - Individual file status management
- `useFileList()` - Advanced file filtering, sorting, and selection
- `useFileStatusManager(fileId)` - File status operations and transcription control

### Automatic Transcription Flow
1. User navigates to player page
2. `usePlayerDataQuery` automatically detects missing transcription
3. Auto-starts transcription via `useTranscription` mutation
4. Real-time status updates via query invalidation
5. UI automatically reflects new transcription status

## Key Patterns

### Error Handling
- Unified error handling via `/src/lib/error-utils.ts`
- Graceful degradation for AI service failures
- API key validation with user-friendly error messages

### Performance Optimization
- Intelligent caching with TanStack Query (5min staleTime, 10min gcTime)
- File chunking for large audio files handled server-side
- Automatic cache invalidation on data changes
- Lazy loading of components and routes
- Memory management with WeakMap for audio URL caching to prevent memory leaks
- Batch processing support for large segment datasets via DBUtils

### Development vs Production Configuration
- **Development**: Standard Next.js mode with hot reload
- **Production**: Standalone output mode for PWA deployment
- MIME type headers configured for both environments

## Environment Configuration

Required environment variables:
```env
GROQ_API_KEY=your_groq_api_key          # Primary AI service
```

Optional configuration:
```env
TRANSCRIPTION_TIMEOUT_MS=180000          # Transcription timeout
TRANSCRIPTION_RETRY_COUNT=2             # Retry attempts
TRANSCRIPTION_MAX_CONCURRENCY=2          # Concurrent processing
```

## Development Workflow

### Starting Development
1. Ensure `.env.local` contains `GROQ_API_KEY`
2. Run `pnpm dev` to start development server
3. Application will be available at http://localhost:3000

### Debugging State Management
- TanStack Query Devtools available in development
- Real-time query inspection and cache management
- Component-level state debugging through React DevTools

### Common Development Patterns

#### Adding New API Endpoints
1. Create route in `/src/app/api/[endpoint]/route.ts`
2. Use Zod for request/response validation
3. Implement error handling with proper HTTP status codes
4. Add corresponding TanStack Query hooks for state management

#### Database Schema Changes
1. Update version in `/src/lib/db.ts`
2. Add migration logic in version upgrade
3. Update TypeScript types in `/src/types/database.ts`
4. Test with existing data through Dexie's migration system

#### Repository Pattern Usage
1. Use `RepositoryFactory` to get repository instances: `const fileRepo = RepositoryFactory.getFileRepository()`
2. All repositories extend `BaseRepository` with common CRUD operations
3. Implement custom methods in specific repository implementations as needed
4. Leverage built-in caching and batch processing capabilities

#### Adding New Components with State
1. Create component in appropriate `/src/components/` subdirectory
2. Use TanStack Query hooks for server state
3. Implement proper loading and error states
4. Add real-time updates through query invalidation

## Deployment & CI

### Vercel Deployment (Recent Migration from Cloudflare Pages)
The application has been migrated from Cloudflare Pages to Vercel deployment for better performance and developer experience:

```bash
# Deploy to production
pnpm deploy           # Build and deploy to production

# Deploy to preview environment
pnpm deploy:preview   # Build and deploy to preview

# Manual deployment steps
pnpm build && vercel --prod
```

**Vercel Configuration**:
- Regions: Hong Kong, Singapore, San Francisco for global coverage
- Function timeout: 30 seconds for API routes
- Optimized caching headers for static assets and API endpoints
- Automatic HTTPS and CDN distribution

### CI Pipeline
The `ci:build` command runs the complete quality assurance pipeline:
1. **Dependency Installation**: `pnpm install --frozen-lockfile`
2. **Code Quality**: `pnpm lint` (Biome.js checks)
3. **Type Safety**: `pnpm type-check` (TypeScript compilation)
4. **Testing**: `pnpm test:run` (Vitest test suite - optional in current workflow)
5. **Build Validation**: `pnpm build` (Production build)

**Note**: While test infrastructure exists with Vitest and React Testing Library, the current development workflow focuses on type safety and code quality through automated linting and formatting.

### Build Configuration
- **Next.js Config**: Optimized for Vercel deployment with serverless functions
- **Bundle Analysis**: Available via `pnpm build:analyze`
- **Image Optimization**: Enabled with Vercel's Image Optimization API
- **Package Optimization**: Standard Next.js optimization for serverless deployment

### Performance Monitoring
- **Lighthouse Integration**: Automated performance audits
- **Bundle Analysis**: Webpack bundle analyzer for optimization
- **Production Optimization**: Standard Next.js optimization for Vercel serverless functions

## Styling System

### Design Tokens
- Complete CSS custom properties system in `/src/styles/globals.css`
- Comprehensive theme system with 4 distinct themes: Dark, Light, System, High Contrast
- WCAG AA compliant color contrast ratios
- Status-based color classes (`.status-success`, `.status-error`, etc.)

### Theme Architecture
- **Dark Theme**: Default dark mode with high contrast (AAA rating for primary text)
- **Light Theme**: Clean light interface with optimal readability
- **System Theme**: Automatically follows OS preference
- **High Contrast Theme**: Enhanced contrast for accessibility
- CSS custom properties with dynamic theme switching
- Local storage persistence for theme preferences
- Theme debugger available with `Ctrl+Shift+T`

### Component Styling
- Tailwind CSS utility classes with custom design tokens
- Consistent spacing and typography scales
- Player-specific styling variables for audio interface
- All shadcn/ui components are theme-aware

### Responsive Design
- Mobile-first approach with Tailwind responsive breakpoints
- Touch-friendly controls for mobile devices
- Adaptive layouts for different screen sizes

## Auto-Transcription Feature

The application includes intelligent auto-transcription:
- Automatically detects when files need transcription
- Starts transcription without user intervention
- Provides real-time progress updates
- Maintains state synchronization across components
- Handles errors gracefully with retry mechanisms

## Testing and Quality Assurance

**Note**: While test infrastructure with Vitest and React Testing Library is available and configured, the current development workflow primarily emphasizes type safety and code quality through automated linting and formatting. Test files exist in `__tests__` directories for key utilities and API routes.

### Type Safety
- Strict TypeScript configuration
- Comprehensive type definitions in `/src/types/`
- Zod schemas for API request/response validation
- Repository pattern with TypeScript interfaces for data access

### Code Quality
- Biome.js for linting and formatting
- Automatic import sorting and cleanup
- Consistent code style across the codebase
- Comprehensive error handling with unified error utilities

### Recent Cleanup and Optimization
- **Migration to Groq SDK**: Simplified AI integration by removing AI SDK abstraction layer
- **File Management Simplification**: Removed grid/list view toggle, implemented unified FileManager component
- **Repository Pattern**: Implemented clean data access layer with base repository and factory pattern
- **Memory Management**: Added WeakMap for audio URL caching to prevent memory leaks
- **State Management Optimization**: Consolidated transcription hooks and removed redundant state management
- **Performance Optimization**: Streamlined database operations and improved indexing

## Theme System & Debugging

### Theme Architecture
The application supports 4 distinct themes with WCAG AA compliance:
- **Dark Theme**: Default dark mode with high contrast
- **Light Theme**: Clean light interface with optimal readability
- **System Theme**: Automatically follows OS preference
- **High Contrast Theme**: Enhanced contrast for accessibility

### Theme Implementation
- **CSS Custom Properties**: Complete design token system in `/src/app/globals.css`
- **Dynamic Theme Switching**: Real-time theme changes without page reload
- **Local Storage Persistence**: Theme preferences automatically saved
- **Component Integration**: All shadcn/ui components theme-aware
- **Semantic Color Variables**: Status-based colors (`.status-success`, `.status-error`, etc.)

### Theme Development
- **Theme Debugging**: Press `Ctrl+Shift+T` to open the theme debugger
- **Design Token System**: Comprehensive CSS variable structure
- **Component Theming**: Consistent theming across all components
- **Responsive Theming**: Mobile-first theme breakpoints

### Code Quality Tools Configuration

#### Biome.js Configuration
```json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noUnknownAtRules": "off"
      }
    }
  },
  "files": {
    "ignoreUnknown": false,
    "includes": ["src/**/*"]
  }
}
```

#### Package Management
- **Package Manager**: pnpm (required version >=8.0.0)
- **Node Engine**: >=18.0.0
- **Frozen Lockfile**: Ensures reproducible builds
- **Husky**: Git hooks for pre-commit quality checks