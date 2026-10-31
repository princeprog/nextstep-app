# NextStep web app

The authenticated web app for **NextStep**, a portfolio job-application tracker: a dashboard of what needs attention,
application records with a six-stage pipeline, time-zone-aware tasks, interview records, search and filters, settings,
and a temporary demo workspace with fictional data.

> Portfolio MVP. Password reset, email verification, hosting, and a production privacy policy are undecided.

## Related projects

| Repository | Role |
| --- | --- |
| [nextstep-app](https://github.com/princeprog/nextstep-app) | This web app. |
| [nextstep-api](https://github.com/princeprog/nextstep-api) | Spring Boot API that owns data, rules, sessions, and CSRF. Required at runtime. |
| [nextstep](https://github.com/princeprog/nextstep) | Separate static marketing website (no shadcn/ui). |

## Stack

- Next.js 16.4 (App Router, Turbopack), React 19, TypeScript
- shadcn/ui (Base UI `base-nova` style) with Tailwind CSS 4 and semantic tokens
- TanStack Query for server state, Zustand for shared UI state (dialogs, last list query)
- Types generated from the API's OpenAPI document (`openapi-typescript`)
- Tests: Vitest (unit), Playwright with axe-core (end-to-end against the real API)

## Prerequisites

- Node.js 20.9+ (developed on 24) and pnpm 11
- A running nextstep-api (see its README) for anything beyond the sign-in screens

## Local setup

```powershell
pnpm install
# In ..
extstep-api: .scriptsdb-dev.ps1 start; .scriptsun-api.ps1
pnpm dev          # http://localhost:3000
```

The browser only talks to this app's origin. Next.js forwards `/api/v1/*` to the API (a rewrite in `next.config.ts`),
so the session cookie and CSRF token stay same-origin.

## Configuration

| Variable | Where | Purpose | Default |
| --- | --- | --- | --- |
| `API_ORIGIN` | server only | Where `/api/v1` requests are forwarded | `http://127.0.0.1:8080` |
| `NEXTSTEP_OPENAPI` | `pnpm api:types` | OpenAPI file path or URL | `../nextstep-api/openapi/openapi.yaml` |
| `E2E_BASE_URL` | Playwright | App URL under test | `http://localhost:3000` |

No secrets are needed by the app. Don't put tokens in `NEXT_PUBLIC_*` variables or browser storage.

## Commands

```powershell
pnpm dev            # development server on :3000
pnpm lint
pnpm typecheck      # next typegen + tsc
pnpm test           # Vitest unit tests (API client, URL list state, date formatting)
pnpm build
pnpm start          # serve the production build on :3000
pnpm api:types      # regenerate src/lib/api/schema.d.ts after an API contract change
pnpm test:e2e       # Playwright; needs a build and a running API
```

End-to-end tests run against the production build and a real API. They create several accounts and demos per run, so
start the API with relaxed local limits:

```powershell
# In ..
extstep-api
.scriptsun-api.ps1 -RelaxedLimits
# In this folder (first time: pnpm exec playwright install chromium)
pnpm build
pnpm test:e2e
```

They cover the full journey (register → application → applied date → task → interview → status → dashboard → complete
→ archive → restore), validation that keeps entered values, account and demo isolation, sign-out and session expiry,
URL list state with back and forward, axe accessibility scans, keyboard use, and 320 px layouts.

## How it's organized

```
src/app/(auth)/        sign-in, register, demo pages
src/app/(app)/         dashboard, applications, tasks, interviews, settings (inside the app shell)
src/features/          feature components and data hooks (TanStack Query)
src/components/        shared pieces; src/components/ui holds shadcn components
src/lib/api/           same-origin client (CSRF, error normalization), generated schema, query keys
src/stores/            Zustand UI store
e2e/                   Playwright tests
```

## Project context (Obsidian)

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

