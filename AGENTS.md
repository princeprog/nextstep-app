# AGENTS.md — nextstep-app

Guidance for coding agents working on the NextStep web app.

## Read the project context first

Before changing behavior or design, read the relevant notes in the owner's Obsidian vault, starting with **Agent
Handoff**, **Frontend Architecture**, **Web App Design**, and the feature note you're touching. When notes disagree,
follow newer explicit user decisions, then the Decision Log, Product Requirements, feature notes, and supporting notes.

## Obsidian links

Product requirements, rules, and decisions live in the owner's local Obsidian vault. **These links point to a local vault on the owner's machine. They won't open for anyone without access to it**; on this machine, an agent can read the Markdown files directly from the absolute paths.

- Project home: [obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FHome](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FHome)
- Vault folder: `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker`

| Note | Obsidian link | File path |
| --- | --- | --- |
| Home | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FHome) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Home.md` |
| Agent Handoff | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FAgent%20Handoff) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Agent Handoff.md` |
| Product Requirements | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FProduct%2FProduct%20Requirements) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Product\Product Requirements.md` |
| User Journeys | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FProduct%2FUser%20Journeys) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Product\User Journeys.md` |
| Business Rules | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FProduct%2FBusiness%20Rules) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Product\Business Rules.md` |
| Frontend Architecture | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FArchitecture%2FFrontend%20Architecture) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Architecture\Frontend Architecture.md` |
| Web App Design | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FDesign%2FWeb%20App%20Design) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Design\Web App Design.md` |
| API Contract | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FArchitecture%2FAPI%20Contract) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Architecture\API Contract.md` |
| Testing Strategy | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FQuality%2FTesting%20Strategy) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Quality\Testing Strategy.md` |
| Decision Log | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FDecisions%2FDecision%20Log) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Decisions\Decision Log.md` |
| Applications | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FProduct%2FFeatures%2FApplications) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Product\Features\Applications.md` |
| Pipeline | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FProduct%2FFeatures%2FPipeline) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Product\Features\Pipeline.md` |
| Tasks and Follow-ups | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FProduct%2FFeatures%2FTasks%20and%20Follow-ups) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Product\Features\Tasks and Follow-ups.md` |
| Interviews | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FProduct%2FFeatures%2FInterviews) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Product\Features\Interviews.md` |
| Dashboard | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FProduct%2FFeatures%2FDashboard) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Product\Features\Dashboard.md` |
| Search, Filters and Sorting | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FProduct%2FFeatures%2FSearch%20Filters%20and%20Sorting) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Product\Features\Search Filters and Sorting.md` |
| Demo Workspace | [Open in Obsidian](obsidian://open?vault=Obsidian%20Vault&file=Projects%2FJob%20Application%20Tracker%2FProduct%2FFeatures%2FDemo%20Workspace) | `C:\Users\Al Prince\Documents\Obsidian Vault\Projects\Job Application Tracker\Product\Features\Demo Workspace.md` |

## Architecture boundaries

- The API owns business rules: ownership, validation, due states, archive, counts. The app displays what the API
  returns; it must not recompute overdue or upcoming states or count records.
- Server data lives in TanStack Query (`src/features/workspace/api.ts`, keys in `src/lib/api/keys.ts`). After a confirmed
  write, call `invalidateWorkspace`. Don't report success before the server confirms.
- Zustand (`src/stores/ui-store.ts`) holds only shared transient UI state. Never put server records, tokens, or secrets there
  or in localStorage.
- List search, filters, sort, and page live in the URL (`features/applications/list-params.ts`). Criteria changes reset to page 1.
- All requests go through `src/lib/api/client.ts`: same-origin cookies, CSRF header on unsafe requests, no automatic replay
  after a CSRF failure, and a session-ended signal that clears private caches.
- Use existing shadcn/ui components (Base UI: compose with `render`, not `asChild`). For navigation styled as a button, use
  `ButtonLink` so it keeps link semantics. Forms use `Field` with `aria-invalid` and `aria-describedby` messages.
- After API contract changes, run `pnpm api:types` and commit the regenerated `schema.d.ts`.
- Keep 320 px layouts, keyboard access, visible focus, and reduced motion working. Private pages stay noindex.

## Verification

```powershell
pnpm lint; pnpm typecheck; pnpm test; pnpm build
pnpm test:e2e     # with ..
extstep-apiscriptsun-api.ps1 -RelaxedLimits running
```

## Don'ts

- Don't add shadcn/ui or app code to the separate website repository.
- No production deployment or real personal data without an explicit request from the owner.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

