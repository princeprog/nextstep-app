# NextStep web app

The authenticated web app for **NextStep**, a portfolio job-application tracker: a dashboard of what needs attention,
application records with a six-stage pipeline, time-zone-aware tasks, interview records, search and filters, settings,
accounts confirmed by email with password reset and change, a JSON download of every record, and a temporary demo
workspace with fictional data.

> Portfolio MVP. Hosting and the email provider are still undecided, and nothing is deployed.

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
- For the end-to-end tests, [Mailpit](https://mailpit.axllent.org/), a local SMTP server with a web inbox (see
  [End-to-end tests](#end-to-end-tests))

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

A new account has to confirm its email before it can sign in. With the API's default `MAIL_MODE=log`, every email,
including its link, is written to the API's log; open the link in the browser. To receive the emails instead, run
Mailpit and start the API with `.\scripts\run-api.ps1 -Mailpit`; the inbox is at http://127.0.0.1:8025.

## Configuration

| Variable | Read by | Purpose | Default |
| --- | --- | --- | --- |
| `API_ORIGIN` | `pnpm dev` at startup, `pnpm build` | Where `/api/v1` requests are forwarded. The build records it and `pnpm start` uses the recorded value, so rebuild after changing it. Never sent to the browser. | `http://127.0.0.1:8080` |
| `APP_HTTPS` | the running server, on every request | Set to `true` when browsers reach the app over HTTPS, for example behind a TLS-terminating proxy. Adds `Strict-Transport-Security` and the CSP `upgrade-insecure-requests` directive. Leave it unset for plain HTTP, including local development. Server-side only; no rebuild needed. | unset |
| `NEXT_PUBLIC_SITE_URL` | `pnpm build`, `pnpm dev` at startup | Address of the public website. The registration form links its Terms of use (`/terms/`) and Privacy policy (`/privacy/`), opened in the same tab. An `http://` or `https://` address; a folder path is allowed and a trailing slash is ignored. Public: the build copies it into the JavaScript sent to browsers, so rebuild after changing it. | `http://localhost:3001` |
| `NEXTSTEP_OPENAPI` | `pnpm api:types` | OpenAPI file path or URL | `../nextstep-api/openapi/openapi.yaml` |
| `E2E_BASE_URL` | Playwright | App URL under test | `http://localhost:3000` |
| `MAILPIT_URL` | Playwright | Mailpit's HTTP API, where the tests read confirmation and reset emails | `http://127.0.0.1:8025` |
| `PERF_BASE_URL` | `pnpm perf` | App URL to measure | `http://localhost:3000` |
| `PERF_RUNS` | `pnpm perf` | Lighthouse runs per page; the median is reported | `1` |
| `CHROME_PATH` | `pnpm perf` | Chromium-based browser for Lighthouse | Chrome, or Edge on Windows |

No secrets are needed by the app. Don't put tokens in `NEXT_PUBLIC_*` variables or browser storage.

## Accounts and email

The API owns the account rules; these screens follow its contract (`../nextstep-api/openapi/openapi.yaml`).

- **Registration** (`/register`) ends on a "Check your email" screen showing the address the API used, with
  **Resend email**, a way to correct a mistyped address, and a sign-in link. The API answers the same way whether or not
  the address already has an account, and the screen never says which. The form links the public site's Terms of use
  and Privacy policy (`NEXT_PUBLIC_SITE_URL`). New passwords need 12 to 128 characters and are refused if they appear in
  a data breach. Registering an address that isn't confirmed yet again replaces its name, password, and time zone and
  sends a new link; older links stop working once that email is sent.
- **Email links** (`/verify-email#token=…`, `/reset-password#token=…`) carry their token in the URL fragment, which
  browsers never send to a server. The page reads it once, removes it from the address bar with
  `history.replaceState`, and waits for a button press, because link scanners open pages. A newer link opened in the
  same tab starts over.
- **Confirming** (`/verify-email`) doesn't sign anyone in; the page then offers **Sign in**. A used, replaced, or expired
  link, or one without its token, says so and offers a new link.
- **Signing in before confirming** is refused with the same "Email or password is incorrect." as a wrong password, so
  sign-in never reveals which addresses have accounts. Under every refusal, the sign-in page says that a new account
  confirms its email first and links to `/resend-confirmation` for a new link. A request refused with
  `403 EMAIL_NOT_VERIFIED` could only come from a session started before sign-in required a confirmed email; the app
  treats it like an ended session, signs out, and opens sign-in with a notice to confirm the email first. The API
  deletes accounts that stay unconfirmed for 7 days.
- **Password reset**: `/forgot-password` always ends with the same message, whether or not an account uses the address.
  `/reset-password` sets the new password, which ends every session of the account and this browser's session, so the
  app clears private data and its CSRF token, then offers sign-in.
- **Settings** for normal accounts: change the password (other devices are signed out, and this session's CSRF token
  is replaced), download every record as JSON (`/api/v1/me/export`, also offered to demos), and delete the account
  after entering its password. Demos see neither the password card nor deletion.
- **Sign-in messages** say why the page opened: `?reason=verified`, `password-reset`, `deleted`, `signed-out`,
  `expired`, `demo-expired`, or `confirm-email`.

## Commands

```powershell
pnpm dev            # development server on :3000
pnpm lint
pnpm typecheck      # next typegen + tsc
pnpm test           # Vitest unit and component tests
pnpm build
pnpm start          # serve the production build on :3000
pnpm test:e2e       # Playwright; needs a build, a running API, and Mailpit (see below)
pnpm perf           # Lighthouse mobile lab check; needs a build and a running API
pnpm test:staging   # checks the production-like staging copy started by scripts\staging.ps1 (see below)
pnpm api:types      # regenerate src/lib/api/schema.d.ts after an API contract change
```

### End-to-end tests

End-to-end tests run against the production build, a real API, and real email captured by Mailpit. The helpers in
`e2e/helpers.ts` register through the form, read the confirmation email from Mailpit's API (`e2e/mailpit.ts`), open
its link, confirm, and sign in. Every account gets a new random password, because the API refuses passwords found in
Have I Been Pwned. A run creates many accounts and demos, so start the API with relaxed local limits and Mailpit:

```powershell
# Mailpit: web inbox and API on 127.0.0.1:8025, SMTP on 127.0.0.1:1025
# (on the owner's machine: %LOCALAPPDATA%\NextStep\tools\mailpit\mailpit.exe)
mailpit --listen 127.0.0.1:8025 --smtp 127.0.0.1:1025
# In ..\nextstep-api
.\scripts\db-dev.ps1 start
.\scripts\run-api.ps1 -RelaxedLimits -Mailpit
# In this folder (first time: pnpm exec playwright install chromium)
pnpm build
pnpm test:e2e
```

`-RelaxedLimits` also raises the API's hourly email allowance (`EMAIL_GLOBAL_LIMIT_PER_HOUR`), which counts every email
sent and every registration, resend, and reset request, so repeated runs keep receiving their emails. If the build used
`NEXT_PUBLIC_SITE_URL`, run the tests with the same value.

Playwright starts two servers from the same build: `pnpm start` on :3000 for the tests, and one on :3100 with
`APP_HTTPS=true` that only the HTTPS header check uses. Locally, servers that are already running are reused.

They cover the full journey (register → application → applied date → task → interview → status → dashboard → complete
→ archive → restore), registration with email confirmation (the check-email screen, which looks the same for a taken
address; resend, after which only the newest link works; sign-in before confirming, refused exactly like a wrong
password, then accepted; registering again before confirming, after which only the newest password works; the form for
a new link that the sign-in hint leads to; a request refused for an unconfirmed email, which signs out), forgot and
reset password (the same message for an unknown address, a reset that signs out another browser, a link that works
once), a password change that signs out another browser while this one keeps working, the data download checked through
the browser's download, account deletion with the password, the Terms and Privacy links, validation that keeps entered
values, account and demo isolation, sign-out (from the sidebar, from settings, and after a dialog was used), session
expiry, URL list state with back and forward (including a filter changed while a search is still being typed), the
application picker finding an application beyond the first page of results, security headers, axe accessibility scans,
keyboard use, and 320 px layouts, which include every account screen. Every test fails if the browser reports a Content
Security Policy or Permissions-Policy problem.

### Lab performance

`pnpm perf` runs Lighthouse with its default mobile emulation (simulated slow 4G, 4x CPU slowdown) against the
production build for `/login`, `/register`, the account email pages (`/forgot-password`, `/resend-confirmation`, and
`/verify-email` and `/reset-password` without a link token), `/demo`, and `/dashboard`. For the dashboard it starts a demo
through the API (CSRF token first, then `POST /api/v1/auth/demo`) and passes the session cookie to Lighthouse as an extra
header.

```powershell
pnpm build
pnpm perf                          # reuses a running pnpm start, otherwise starts one for the run
$env:PERF_RUNS = '3'; pnpm perf    # median of three runs per page
```

It prints the category scores with LCP, CLS, TBT, FCP, and Speed Index, flags values above Lighthouse's mobile "good"
thresholds (LCP 2.5 s, CLS 0.1, TBT 200 ms, FCP 1.8 s, Speed Index 3.4 s), and writes HTML and JSON reports plus a
`summary.json` to `lighthouse-reports/<timestamp>/`, which git ignores. SEO scores are low on purpose because every page
is noindex. Lab numbers depend on the machine, so this check isn't part of CI.

Measured on 2026-11-01 with Chrome on Windows, median of three runs:

| Page | Performance | Accessibility | Best practices | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- |
| `/login` | 100 | 100 | 96 | 0.91 s | 0 | 28 ms |
| `/register` | 100 | 100 | 96 | 0.91 s | 0 | 36 ms |
| `/forgot-password` | 100 | 100 | 100 | 0.91 s | 0 | 38 ms |
| `/resend-confirmation` | 100 | 100 | 100 | 0.91 s | 0 | 52 ms |
| `/verify-email` | 100 | 100 | 100 | 0.91 s | 0.027 | 25 ms |
| `/reset-password` | 100 | 100 | 100 | 0.91 s | 0.020 | 24 ms |
| `/demo` | 100 | 100 | 96 | 0.91 s | 0 | 24 ms |
| `/dashboard` | 99 | 100 | 100 | 0.91 s | 0 | 107 ms |

Best practices is 96 on `/login`, `/register`, and `/demo` only because those pages ask `/api/v1/me` whether the visitor is
already signed in, and Chrome logs the expected 401 for an anonymous visitor as a console error. The small layout shift on
`/verify-email` and `/reset-password` comes from reading the link token after the page loads; both stay well under the
0.1 threshold.

## Production-like staging (local)

`scripts/staging.ps1` runs the whole product the way production will, on this machine only, so a release can be checked
before anything is deployed.

| Piece | How it runs |
| --- | --- |
| Caddy | `https://app.nextstep.localhost:8443` (the app) and `https://nextstep.localhost:8443` (the website), with certificates from Caddy's own local authority, which isn't added to Windows. Like a host's edge, it replaces any `X-Forwarded-For` the client sends and sets `X-Forwarded-Proto` (`staging/Caddyfile`). |
| App | `next start` on 127.0.0.1:3200 with `APP_HTTPS=true`, built into `.next-staging` (`NEXT_DIST_DIR`, so the `.next` build that `pnpm test:e2e` uses is untouched) with `API_ORIGIN=http://127.0.0.1:8081` and `NEXT_PUBLIC_SITE_URL=https://nextstep.localhost:8443`. |
| API | The jar with `SPRING_PROFILES_ACTIVE=production` on 127.0.0.1:8081: production rate limits, a new `IDENTIFIER_HASH_KEY` on every start, the `nextstep_staging` database, SMTP to Mailpit, and the real Pwned Passwords check. |
| Website | The static export built with `SITE_ENV=production` for the staging origins, served by Caddy. |
| Email | Mailpit stands in for the email provider (inbox at http://127.0.0.1:8025). |

```powershell
..\nextstep-api\scripts\db-dev.ps1 start    # the development PostgreSQL cluster
.\scripts\staging.ps1 start -Fresh          # builds everything, recreates nextstep_staging, starts the services
pnpm test:staging                           # playwright.staging.config.ts and e2e-staging/
.\scripts\staging.ps1 stop
```

`pnpm test:staging` checks:

- the production headers on pages, and HSTS on API responses, which shows the HTTPS forwarding headers reach the API
- that actuator endpoints aren't reachable through the public origin
- the whole journey: sign up, confirm through the emailed link, the `__Host-` session cookie, an application, export,
  password reset, and deletion
- the links between the website and the app
- that a client can't dodge per-address limits with its own `X-Forwarded-For`

The last test uses up 127.0.0.1's sign-in allowance for 15 minutes, so start staging with `-Fresh` before running the
tests again. Requests to the `*.localhost` hosts are made from the browser, because Node can't resolve those names on
Windows. The last run (2026-11-01) passed 4 of 4, and the API's production log held only INFO entries, with no email or
client addresses.

It needs JDK 25, Caddy and Mailpit (`CADDY_PATH` and `MAILPIT_PATH`, on PATH, or under `%LOCALAPPDATA%\NextStep\tools`), and
the `nextstep-api` and `nextstep` checkouts next to this one. Logs and process IDs go to `%LOCALAPPDATA%\NextStep\staging`.

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
    generated passwords. It downloads Mailpit v1.33.0, checks it against a pinned SHA-256, and starts it on
    127.0.0.1:8025 (SMTP on 1025). It builds the API with `./mvnw -B -DskipTests package`, starts the jar in the
    background with relaxed rate limits (the hourly email allowance included) and email sent to Mailpit, and waits for
    `/api/v1/auth/csrf`. Then it builds the app, installs Playwright Chromium with its system dependencies, and runs
    `pnpm test:e2e`. On failure it uploads the Playwright report, traces, and the API, PostgreSQL, and Mailpit logs for
    7 days.
- `.github/workflows/security.yml` runs on every push and pull request, and weekly on Mondays.
  - `pnpm audit --audit-level high` fails on high or critical advisories.
  - OSV-Scanner checks `pnpm-lock.yaml`. Reviewed exceptions are in `osv-scanner.toml`, each with a reason and an expiry
    date so the scan fails again when it's time to review them.
  - gitleaks scans the full git history and redacts anything it finds from the log.

  Both scanners are downloaded from their GitHub releases and checked against SHA-256 hashes pinned in the workflow. To
  update one, change its version and hash together.
- `.github/dependabot.yml` opens weekly update pull requests for npm packages (minor and patch updates grouped; ESLint
  and `@types/node` major versions held back, see the comments there) and for the GitHub Actions.

## Operations runbooks

The nextstep-api README holds the full deploy, roll back, restore, secret rotation, and monitoring runbooks. These are
the app's parts.

**Deploy**

1. Build with the production values. `pnpm build` fixes `API_ORIGIN` (the API's private address) and `NEXT_PUBLIC_SITE_URL`
   (the website's https origin) into the build, so rebuild when either changes. The container image (below) takes them
   as build arguments.
2. Run `next start` with `APP_HTTPS=true` behind the host's HTTPS proxy. The proxy must replace `X-Forwarded-For` with the
   client's address, or append it, and `next start` must not be reachable any other way: the app passes that header to
   the API unchanged, and the API's per-address limits depend on it.
3. Check `https://<app origin>/api/v1/health` (`{"status":"UP"}`), then sign in, open the dashboard, and sign out. After the
   first deploy on a new host, run `$env:STAGING_URL = "https://<app origin>"; pnpm test:staging -g "per-address"` to confirm
   the proxy sets the client address. It uses up your own address's sign-in allowance for 15 minutes.

**Roll back**: redeploy the previous build. The app keeps no state of its own, and sessions live in the API's database, so
nobody is signed out.

**Secrets**: the app holds none. `API_ORIGIN` and `NEXT_PUBLIC_SITE_URL` are configuration.

### Container image

`Dockerfile` builds the Next.js standalone server for any host that runs containers. Only the image build sets
`NEXT_OUTPUT=standalone`; other builds keep `next start`. The build refuses to run without both build arguments, and the
runtime image runs `node server.js` as the non-root `node` user on `PORT` 3000 with `APP_HTTPS=true`. Run it behind the
host's HTTPS proxy, as described in "Deploy" above. Base images are pinned by digest, and Dependabot proposes updates.

```bash
docker build -t nextstep-app \
  --build-arg API_ORIGIN=http://<API private address>:8080 \
  --build-arg NEXT_PUBLIC_SITE_URL=https://<website origin> .
docker run -p 3000:3000 nextstep-app
```

CI builds the image, starts it, and checks that `/login` has a nonce-based CSP and HSTS, that the build used
`NEXT_PUBLIC_SITE_URL`, and that the container doesn't run as root.

## How it's organized

```
src/app/(auth)/        sign-in, register, demo, email confirmation, and password reset pages
src/app/(app)/         dashboard, applications, tasks, interviews, settings (inside the app shell)
src/features/          feature components and data hooks (TanStack Query)
src/components/        shared pieces; src/components/ui holds shadcn components
src/lib/api/           same-origin client (CSRF, error normalization), generated schema, query keys
src/lib/               formatting, time zones, URL page parsing, security headers
src/proxy.ts           per-request Content-Security-Policy (and HSTS when APP_HTTPS=true)
src/stores/            Zustand UI store
e2e/                   Playwright tests (e2e/fixtures.ts adds the CSP check to every test; e2e/mailpit.ts reads emails)
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
