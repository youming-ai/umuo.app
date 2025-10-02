# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `src/app/`, `src/components/`, `src/lib/`, `src/hooks/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- For Oumu.ai: Next.js 15 structure with `src/app/` for pages, `src/components/` for UI, `src/lib/` for utilities

## Phase 3.1: Setup
- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize Next.js 15 project with React 19 + TypeScript dependencies
- [ ] T003 [P] Configure Biome.js linting and formatting tools
- [ ] T004 [P] Setup shadcn/ui + Tailwind CSS configuration

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T005 [P] Contract test POST /api/transcribe in src/lib/api-processor.test.ts
- [ ] T006 [P] Contract test GET /api/progress in src/lib/progress-monitor.test.ts
- [ ] T007 [P] Integration test audio upload workflow in src/hooks/useTranscriptionManager.test.ts
- [ ] T008 [P] Integration test audio playback sync in src/components/AudioPlayer.test.tsx

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T009 [P] Audio model in src/lib/database.ts (Dexie schema)
- [ ] T010 [P] Transcription service in src/lib/transcription-service.ts
- [ ] T011 [P] Audio processor in src/lib/audio-processor.ts
- [ ] T012 POST /api/transcribe endpoint
- [ ] T013 GET /api/progress endpoint
- [ ] T014 Input validation with Zod schemas
- [ ] T015 Error handling and logging with toast notifications

## Phase 3.4: Integration
- [ ] T016 Connect transcription service to IndexedDB
- [ ] T017 Groq AI service integration
- [ ] T018 Request/response logging for API calls
- [ ] T019 Audio playback sync with subtitles

## Phase 3.5: Polish
- [ ] T020 [P] Unit tests for validation in src/lib/validation.test.ts
- [ ] T021 Performance tests for audio processing (<200ms response)
- [ ] T022 [P] Update README.md and documentation
- [ ] T023 Remove code duplication and optimize imports
- [ ] T024 Manual testing with audio samples

## Dependencies
- Tests (T005-T008) before implementation (T009-T015)
- T009 blocks T010, T016
- T017 blocks T018
- Implementation before polish (T020-T024)

## Parallel Example
```
# Launch T005-T008 together:
Task: "Contract test POST /api/transcribe in src/lib/api-processor.test.ts"
Task: "Contract test GET /api/progress in src/lib/progress-monitor.test.ts"
Task: "Integration test audio upload workflow in src/hooks/useTranscriptionManager.test.ts"
Task: "Integration test audio playback sync in src/components/AudioPlayer.test.tsx"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- Avoid: vague tasks, same file conflicts

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task
   
2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks
   
3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup → Tests → Models → Services → Endpoints → Polish
   - Dependencies block parallel execution

## Validation Checklist
*GATE: Checked by main() before returning*

- [ ] All contracts have corresponding tests
- [ ] All entities have model tasks
- [ ] All tests come before implementation
- [ ] Parallel tasks truly independent
- [ ] Each task specifies exact file path
- [ ] No task modifies same file as another [P] task