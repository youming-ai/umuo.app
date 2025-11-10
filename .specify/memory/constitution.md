<!--
Sync Impact Report:
Version change: 0.0.0 → 1.0.0 (initial constitution)
Modified principles: N/A (new constitution)
Added sections: Core Principles (5 principles), Technology Standards, Development Workflow, Governance
Removed sections: N/A (new constitution)
Templates requiring updates: ✅ plan-template.md (Constitution Check aligned), ✅ spec-template.md (user stories aligned), ✅ tasks-template.md (independent delivery aligned)
Follow-up TODOs: None
-->

# umuo.app Constitution

## Core Principles

### I. User Experience First
Every feature MUST prioritize language learning effectiveness; Audio processing MUST be real-time and responsive; Transcription accuracy MUST never be compromised for performance; UI MUST support accessibility standards with WCAG AA compliance.

### II. TypeScript Strict Mode
All code MUST use TypeScript strict mode; Types MUST be comprehensive and explicit; No `any` types permitted without explicit justification; Zod schemas MUST validate all API inputs/outputs; Database operations MUST be fully typed.

### III. Modern Web Architecture
Frontend MUST use Next.js 15 with App Router; State MUST be managed with TanStack Query for server state; Component state MUST use React hooks; UI components MUST be built with shadcn/ui and Radix UI; Styling MUST use Tailwind CSS with custom design tokens.

### IV. Performance & Accessibility
Core Web Vitals MUST meet Lighthouse performance thresholds; Audio processing MUST optimize for memory usage; Client-side storage MUST use IndexedDB via Dexie; Application MUST be fully responsive; Interactive controls MUST be touch-friendly on mobile devices.

### V. Code Quality & Standards
All code MUST pass Biome.js linting and formatting; Imports MUST be automatically sorted and cleaned; Error handling MUST use unified error utilities; All API routes MUST implement proper HTTP status codes; Code reviews MUST verify compliance with this constitution.

## Technology Standards

### Frontend Requirements
- **Framework**: Next.js 15 with App Router and TypeScript strict mode
- **Language**: TypeScript 5.9+ with strict compiler options
- **UI Library**: React 19 + shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design token system
- **State Management**: TanStack Query for server state, React hooks for component state
- **Database**: IndexedDB via Dexie for client-side persistence

### AI Integration Requirements
- **Primary AI Service**: Groq SDK with Whisper-large-v3-turbo for transcription
- **Text Processing**: Groq SDK for normalization and enhancement
- **API Pattern**: Server-side API routes with client-side state management
- **Direct Integration**: Must use direct Groq SDK integration, not AI SDK abstractions

### Performance Standards
- **Build Targets**: Development mode for local development, standalone output for production
- **Bundle Optimization**: Next.js optimization with Vercel serverless functions
- **MIME Types**: Properly configured for both development and production environments
- **Caching**: Intelligent caching with 5-minute stale time, 10-minute garbage collection

## Development Workflow

### Quality Gates
- **Type Safety**: TypeScript compilation must pass without errors
- **Code Quality**: Biome.js checks must pass with zero warnings
- **Build Validation**: Production build must complete successfully
- **API Validation**: All endpoints must have Zod schema validation

### Development Process
- **Package Management**: Must use pnpm >= 8.0.0 with frozen lockfile
- **Environment Setup**: Development requires GROQ_API_KEY in .env.local
- **Local Development**: Use `pnpm dev` with hot reload enabled
- **Production Testing**: Use `pnpm start` to validate production builds

### Deployment Standards
- **Platform**: Vercel deployment optimized for global coverage
- **Regions**: Hong Kong, Singapore, San Francisco for CDN distribution
- **Function Timeout**: 30-second limit for API routes
- **Monitoring**: Automated Lighthouse performance audits

## Governance

### Constitution Supremacy
This constitution supersedes all other practices and guidelines. All pull requests and code reviews must verify compliance with these principles. Violations require explicit justification in complexity tracking documentation.

### Amendment Process
- **Proposal**: Amendments must be documented with clear rationale
- **Review**: Requires team approval and impact assessment
- **Version Control**: Must increment semantic version according to change scope
- **Communication**: All amendments must be communicated with migration guidance

### Compliance Requirements
- **Pre-commit Validation**: Automated checks enforce constitution compliance
- **Review Process**: Human reviewers must validate constitutional adherence
- **Complexity Justification**: Any deviation must be documented with rationale
- **Runtime Guidance**: Use CLAUDE.md for detailed development guidance

**Version**: 1.0.0 | **Ratified**: 2025-11-03 | **Last Amended**: 2025-11-03