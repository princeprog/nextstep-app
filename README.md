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
- Tests: Vitest with Testing Library (unit and component), Playwright with axe-core (end-to-end against the real API),
  Lighthouse (local lab performance)

## Prerequisites

- Node.js 24 and pnpm 11. CI uses Node 24; some dependencies require at least Node 22.19.
- A running nextstep-api (see its README) for anything beyond the sign-in screens

## Local setup

```powershell
pnpm install
# In ..\nextstep-api (first time only: .\scripts\db-dev.ps1 init)
.\scripts\db-dev.ps1 start
.\scripts\run-api.ps1
# Back in this folder
pnpm dev          # http://localhost:3000
```

The browser only talks to this app's origin. Next.js forwards `/api/v1/*` to the API (a rewrite in `next.config.ts`),
so the session cookie and CSRF token stay same-origin.

## Configuration

| Variable | Read by | Purpose | Default |
| --- | --- | --- | --- |
| `API_ORIGIN` | `pnpm dev` at startup, `pnpm build` | Where `/api/v1` requests are forwarded. The build records it and `pnpm start` uses the recorded value, so rebuild after changing it. Never sent to the browser. | `http://127.0.0.1:8080` |
| `APP_HTTPS` | the running server, on every request | Set to `true` when browsers reach the app over HTTPS, for example behind a TLS-terminating proxy. Adds `Strict-Transport-Security` and the CSP `upgrade-insecure-requests` directive. Leave it unset for plain HTTP, including local development. Server-side only; no rebuild needed. | unset |
| `NEXTSTEP_OPENAPI` | `pnpm api:types` | OpenAPI file path or URL | `../nextstep-api/openapi/openapi.yaml` |
| `E2E_BASE_URL` | Playwright | App URL under test | `http://localhost:3000` |
| `PERF_BASE_URL` | `pnpm perf` | App URL to measure | `http://localhost:3000` |
| `PERF_RUNS` | `pnpm perf` | Lighthouse runs per page; the median is reported | `1` |
| `CHROME_PATH` | `pnpm perf` | Chromium-based browser for Lighthouse | Chrome, or Edge on Windows |

No secrets are needed by the app. Don't put tokens in `NEXT_PUBLIC_*` variables or browser storage.

## Commands

```powershell
pnpm dev            # development server on :3000
pnpm lint
pnpm typecheck      # next typegen + tsc
pnpm test           # Vitest unit and component tests
pnpm build
pnpm start          # serve the production build on :3000
pnpm test:e2e       # Playwright; needs a build and a running API
pnpm perf           # Lighthouse mobile lab check; needs a build and a running API
pnpm api:types      # regenerate src/lib/api/schema.d.ts after an API contract change
```

### End-to-end tests

End-to-end tests run against the production build and a real API. They create several accounts and demos per run, so
start the API with relaxed local limits:

```powershell
# In ..\nextstep-api
.\scripts\run-api.ps1 -RelaxedLimits
# In this folder (first time: pnpm exec playwright install chromium)
pnpm build
pnpm test:e2e
```

Playwright starts two servers from the same build: `pnpm start` on :3000 for the tests, and one on :3100 with
`APP_HTTPS=true` that only the HTTPS header check uses. Locally, servers that are already running are reused.

They cover the full journey (register → application → applied date → task → interview → status → dashboard → complete
→ archive → restore), validation that keeps entered values, account and demo isolation, sign-out (from the sidebar,
from settings, and after a dialog was used), account deletion, session expiry, URL list state with back and forward
(including a filter changed while a search is still being typed), the application picker finding an application beyond
the first page of results, security headers, axe accessibility scans, keyboard use, and 320 px layouts. Every test fails
if the browser reports a Content Security Policy or Permissions-Policy problem.

### Lab performance

`pnpm perf` runs Lighthouse with its default mobile emulation (simulated slow 4G, 4x CPU slowdown) against the
production build for `/login`, `/register`, `/demo`, and `/dashboard`. For the dashboard it starts a demo through the API
(CSRF token first, then `POST /api/v1/auth/demo`) and passes the session cookie to Lighthouse as an extra header.

```powershell
pnpm build
pnpm perf                          # reuses a running pnpm start, otherwise starts one for the run
$env:PERF_RUNS = '3'; pnpm perf    # median of three runs per page
```

It prints the category scores with LCP, CLS, TBT, FCP, and Speed Index, flags values above Lighthouse's mobile "good"
thresholds (LCP 2.5 s, CLS 0.1, TBT 200 ms, FCP 1.8 s, Speed Index 3.4 s), and writes HTML and JSON reports plus a
`summary.json` to `lighthouse-reports/<timestamp>/`, which git ignores. SEO scores are low on purpose because every page
is noindex. Lab numbers depend on the machine, so this check isn't part of CI.

## Security headers

`src/proxy.ts` gives every page response a Content-Security-Policy with a fresh nonce. Next.js adds that nonce to the
scripts it renders, so the root layout renders every page per request instead of prerendering it.

| Directive | Value | Why |
| --- | --- | --- |
| `script-src` | `'self' 'nonce-…' 'strict-dynamic'` | Only scripts carrying this response's nonce, and the chunks they load, run. No `unsafe-inline` or `unsafe-eval` in production; `next dev` adds only `'unsafe-eval'` for React's development tooling. |
| `style-src` | `'self' 'unsafe-inline'` | Styles can't run script. Sonner inserts its stylesheet at runtime and the sidebar sets CSS variables in style attributes. |
| `connect-src` | `'self'` | The browser only calls this origin; the API is reached through the `/api/v1` rewrite. |
| `default-src`, `img-src`, `font-src` | `'self'` (images also `data:`) | Fonts are self-hosted by `next/font`. |
| `object-src`, `frame-ancestors` | `'none'` | No plugins; the app can't be framed. |
| `base-uri`, `form-action` | `'self'` | |
| `upgrade-insecure-requests` | only with `APP_HTTPS=true` | |

`next.config.ts` adds the static headers to every response: `X-Robots-Tag: noindex, nofollow`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a
`Permissions-Policy` that denies the camera, microphone, geolocation, payment, USB, and motion sensors, and
`Cross-Origin-Opener-Policy: same-origin`. With `APP_HTTPS=true`, pages also get
`Strict-Transport-Security: max-age=31536000; includeSubDomains`. Only set it when every browser request arrives over
HTTPS: browsers then refuse plain HTTP for the host and its subdomains for a year.

## Continuous integration and scanning

The workflows pin every action to a commit SHA, grant only read access to the repository contents, and cancel superseded
runs except on `main`.

- `.github/workflows/ci.yml` runs on every push and pull request.
  - **checks**: `pnpm install --frozen-lockfile`, lint, typecheck, unit tests, and build.
  - **e2e**: checks out `princeprog/nextstep-api` at `main`, sets up Temurin JDK 25, installs the PostgreSQL 18 server
    binaries from the PGDG apt repository, and starts a throwaway cluster on 127.0.0.1 as the runner user with
    generated passwords. It builds the API with `./mvnw -B -DskipTests package`, starts the jar in the background with
    relaxed rate limits, and waits for `/api/v1/auth/csrf`. Then it builds the app, installs Playwright Chromium with
    its system dependencies, and runs `pnpm test:e2e`. On failure it uploads the Playwright report, traces, and the
    API and PostgreSQL logs for 7 days.
- `.github/workflows/security.yml` runs on every push and pull request, and weekly on Mondays.
  - `pnpm audit --audit-level high` fails on high or critical advisories.
  - OSV-Scanner checks `pnpm-lock.yaml`. Reviewed exceptions are in `osv-scanner.toml`, each with a reason and an expiry
    date so the scan fails again when it's time to review them.
  - gitleaks scans the full git history and redacts anything it finds from the log.

  Both scanners are downloaded from their GitHub releases and checked against SHA-256 hashes pinned in the workflow. To
  update one, change its version and hash together.
- `.github/dependabot.yml` opens weekly update pull requests for npm packages (minor and patch updates grouped; ESLint
  and `@types/node` major versions held back, see the comments there) and for the GitHub Actions.

## How it's organized

```
src/app/(auth)/        sign-in, register, demo pages
src/app/(app)/         dashboard, applications, tasks, interviews, settings (inside the app shell)
src/features/          feature components and data hooks (TanStack Query)
src/components/        shared pieces; src/components/ui holds shadcn components
src/lib/api/           same-origin client (CSRF, error normalization), generated schema, query keys
src/lib/               formatting, time zones, URL page parsing, security headers
src/proxy.ts           per-request Content-Security-Policy (and HSTS when APP_HTTPS=true)
src/stores/            Zustand UI store
e2e/                   Playwright tests (e2e/fixtures.ts adds the CSP check to every test)
scripts/               API type generation, Lighthouse lab check
.github/               CI, security scanning, Dependabot
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
