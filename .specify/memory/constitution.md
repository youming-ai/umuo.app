<!--
Sync Impact Report:
Version change: 1.0.0 → 1.0.1 (minor amendment)
Modified principles:
- II. AI Service Integration (refined to reflect Groq-only architecture)
Added sections: None
Removed sections: None
Templates requiring updates: ✅ All templates already aligned
Follow-up TODOs: None
-->

# Oumu.ai Constitution

## Core Principles

### I. Privacy-First Architecture
All user data MUST be stored locally in the browser using IndexedDB; No server-side data persistence of user content; Audio files and transcripts remain under user control; Local-first approach ensures privacy and offline capability.

### II. AI Service Integration (Amended)
Primary transcription via Groq Whisper-large-v3-turbo; Text processing through Groq openai/gpt-oss-20b model; Single AI service provider for consistency and reduced complexity; All AI interactions MUST include proper error handling and user feedback; No fallback or multi-service configurations permitted.

### III. Test-Driven Development
TDD mandatory for all new features; Tests written BEFORE implementation (Red-Green-Refactor); Jest with React Testing Library for unit tests; Integration tests for API routes and database operations; Tests MUST pass before commits.

### IV. Progressive Enhancement
Core functionality MUST work without JavaScript dependencies; Enhanced features layered on top of working base; Graceful degradation for unsupported browsers; Offline capability as primary requirement, not afterthought.

### V. Simplicity & Maintainability
Single responsibility per component/hook; Avoid premature abstractions; Use boring, obvious solutions over clever ones; Clear data flow and explicit dependencies; Code should be readable by 6 months in the future.

## Technical Standards

### Technology Stack Requirements
Next.js 15 with App Router; React 19 with TypeScript strict mode; shadcn/ui components with Radix UI primitives; Tailwind CSS with custom design tokens; IndexedDB via Dexie for client-side storage; Groq SDK as the exclusive AI service integration.

### Performance Standards
Audio file chunking for files >50MB; API response times <2 seconds; UI interactions <100ms; Memory usage growth <50MB during processing; Batch database operations for efficiency.

### Security Requirements
XSS protection for all user inputs; No server-side data persistence; API keys managed via environment variables; Local data encryption for sensitive information; Input validation using Zod schemas; CSP policies limited to Groq API endpoints only.

### AI Service Configuration
Single environment variable required: GROQ_API_KEY; No backup or alternative AI service configurations; Model selection limited to Groq-hosted models only; Error handling MUST provide user-friendly messages for Groq-specific failures.

## Development Workflow

### Code Quality Gates
All commits MUST compile successfully; All tests MUST pass; Biome.js linting and formatting with zero warnings; TypeScript strict mode compliance; Self-review required before commits.

### Feature Development Process
1. Research existing patterns in codebase
2. Write specification in `/specs/[feature-name]/spec.md`
3. Create implementation plan using `/speckit.plan`
4. Generate tasks with `/speckit.tasks`
5. Implement with TDD approach
6. Test and validate independently
7. Commit with clear message linking to plan

### Error Handling Standards
Fail fast with descriptive error messages; Include context for debugging; Handle errors at appropriate levels; Never silently swallow exceptions; User-friendly error messages with recovery suggestions.

## Governance

This constitution supersedes all other development practices; All feature specifications MUST comply with these principles; Amendments require version increment and documentation; Compliance verification during code reviews; Complex patterns MUST be justified against simplicity principle; Any deviation from single AI service principle requires constitutional amendment.

**Version**: 1.0.1 | **Ratified**: 2025-10-09 | **Last Amended**: 2025-10-09