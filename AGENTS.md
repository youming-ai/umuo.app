# Repository Guidelines

## Project Structure & Module Organization
The Next.js App Router lives in `src/app`; each route folder pairs UI, layouts, and server actions. Shared UI primitives and icons live in `src/components`, stateful hooks in `src/hooks`, and all API/domain logic in `src/lib`. Global types stay under `src/types`. Static assets belong in `public/`. Architecture notes and scenario playbooks live in `docs/`, while automated fixtures sit in `test/diagnostic` and `test/factories`.

## Build, Test, and Development Commands
Use pnpm 10:
- `pnpm dev` launches the local dev server with HMR.
- `pnpm build` compiles the production bundle; run before profiling or deploying.
- `pnpm start` serves the `.next` build for smoke checks.
- `pnpm lint` runs Biome; `pnpm format` applies fixes.
- `pnpm type-check` runs the TypeScript compiler in noEmit mode.

## Coding Style & Naming Conventions
Biome enforces two-space indentation, 100-character lines, and rules like `noUnusedImports` and `useConst`. Favor `PascalCase` for components (`AudioRecorderPanel`), `camelCase` for hooks and variables (`useTranscriptionStatus`), and `SCREAMING_SNAKE_CASE` for env constants. Keep JSX declarative and lean on Tailwind utilities defined in `tailwind.config.ts`. Always run `pnpm format` before committing.

## Testing Guidelines
Jest + Testing Library power unit and integration suites. Mirror source paths in `test/unit` or `test/integration`, naming specs `*.test.ts` or `*.test.tsx`. Reuse IndexedDB helpers from `test/factories` and diagnostics from `test/diagnostic`. Run `pnpm test` for CI parity, `pnpm test:watch` when iterating, and `pnpm test:coverage` when touching core flows to maintain coverage gates.

## Commit & Pull Request Guidelines
Write concise, imperative commits (`fix: align Dexie schema`). Keep subject lines under 72 chars and add context in the body when behavior shifts. Reference issues with `Closes #123` when applicable. PRs should summarize intent, flag user-visible changes, and attach before/after screenshots for UI work. Verify `pnpm lint`, `pnpm type-check`, and `pnpm test` locally before requesting review.

## Security & Configuration Tips
Copy `.env.example` to `.env.local` and inject Groq/OpenRouter keys; never commit secrets. Persist user media to IndexedDB only and avoid server storage. Document any new flags or setup steps in `docs/` so other agents can reproduce your environment.

