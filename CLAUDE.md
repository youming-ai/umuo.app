# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Oumu.ai is a language learning application focused on shadowing practice with AI-powered audio transcription. The application processes audio files, generates transcripts with timestamps, and provides an interactive player for language learning.

## Core Architecture

### Frontend Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **UI**: React 19 + shadcn/ui components + Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: React hooks + custom hooks
- **Database**: IndexedDB via Dexie (client-side)

### AI Integration
- **Primary**: Groq SDK (Whisper-large-v3-turbo for transcription)
- **Text Processing**: Groq openai/gpt-oss-20b for text normalization
- **Processing**: Direct Groq SDK integration

### Data Flow
```
Audio Upload → File Chunking → Transcription API → Post-processing → IndexedDB Storage
    ↓              ↓              ↓               ↓              ↓
File Management   Chunk Processing   AI Services   Text Normalization   Player Interface
```

## Available Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run Biome.js linter
pnpm format           # Format code with Biome.js
pnpm type-check       # TypeScript type checking

# Testing
pnpm test             # Run Jest tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage report
```

## Key Directories

- `/src/app` - Next.js App Router pages and API routes
- `/src/components` - React components organized by feature
- `/src/hooks` - Custom React hooks for state management
- `/src/lib` - Utility functions, database operations, and API clients
- `/src/types` - TypeScript type definitions
- `/specs` - Feature specifications and implementation plans

## Database Schema

The application uses Dexie (IndexedDB) with the following main tables:
- `files` - Audio file metadata and storage
- `fileChunks` - Large file split into chunks
- `transcripts` - Transcription status and metadata
- `segments` - Time-coded transcript segments with word timestamps

## API Routes Structure

- `/api/transcribe-ai` - Main transcription endpoint using Groq
- `/api/postprocess` - Text normalization and enhancement
- `/api/progress/[fileId]` - Real-time progress tracking
- `/api/health-check/*` - System health monitoring endpoints

## Component Architecture

### Player Components
- `AudioPlayer` - Main audio playback with time synchronization
- `SubtitleDisplay` - Time-synced subtitle display with highlighting
- `ScrollableSubtitleDisplay` - Scrollable subtitle list with active highlighting

### File Management
- `FileUpload` - Drag-and-drop file upload with validation
- `FileList` - Grid/list view of uploaded files
- `FileCard` - Individual file display with status

### Settings & Configuration
- `SettingsPage` - Application configuration
- `AccountPage` - User account and subscription management

## Key Patterns

### Error Handling
- Unified error handling via `/src/lib/error-handler.ts`
- Graceful degradation for AI service failures
- User-friendly error messages with recovery suggestions

### Performance Optimization
- File chunking for large audio files (>50MB)
- Batch processing for database operations
- Lazy loading of components and routes

### State Management
- Custom hooks for complex state (useAudioPlayer, useFiles, etc.)
- Local storage for user preferences
- IndexedDB for persistent data

## Development Guidelines

### Code Style
- Use Biome.js for formatting and linting
- Follow TypeScript strict mode requirements
- Prefer composition over inheritance
- Implement proper error boundaries

### Testing
- Jest with React Testing Library
- Mock external dependencies (API calls, IndexedDB)
- Test user behavior rather than implementation details

### Database Operations
- Always use transactional operations for data consistency
- Implement proper error handling for database failures
- Use batch operations for performance

## Environment Configuration

Required environment variables:
```env
GROQ_API_KEY=your_groq_api_key          # Primary AI service
```

## Health Check System

The application includes a comprehensive health check system (`/health-check`) that monitors:
- AI service connectivity and performance
- Database operations and storage usage
- Error handling and recovery mechanisms
- User experience metrics

## Common Development Tasks

### Adding New AI Service
1. Create client in `/src/lib/[service]-client.ts`
2. Add endpoint to `/src/app/api/`
3. Update error handling in `/src/lib/error-handler.ts`
4. Add health check integration

### Database Schema Changes
1. Update version in `/src/lib/db.ts`
2. Add migration logic in version upgrade
3. Update TypeScript types in `/src/types/`
4. Test with existing data

### Player Feature Development
1. Add hook to `/src/hooks/useAudioPlayer*.ts`
2. Create component in `/src/components/player/`
3. Update `PlayerPage.tsx` to integrate
4. Add subtitle synchronization if needed