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
- Pick applications with `ApplicationPicker`, which searches through the API (`useApplicationSearch`); don't load a fixed
  page of applications into a select.
- Leave the workspace on purpose (sign-out, account deletion) through `useExitWorkspace` from `src/components/exit-workspace.tsx`.
  It clears private data once and ignores 401 responses from requests still in flight.
- Buttons that stay on screen while their request runs (resend, save, change password) pass `focusableWhenDisabled` with
  `disabled`, so keyboard focus stays on them instead of jumping to the page.
- Keep 320 px layouts, keyboard access, visible focus, and reduced motion working. Private pages stay noindex.

## Accounts and email links

- Never reveal whether an email has an account. Registration, resend, and reset requests end on the same screen or
  message whatever the API knows, and sign-in refuses an unconfirmed account exactly like a wrong password (the
  confirm-first hint shows under every refusal). Don't add copy or behavior that differs by case.
- Email links carry a one-time token in the URL fragment. Read it only with `useLinkToken`
  (`src/features/auth/link-token.ts`), which removes it from the address bar. Don't move it into a query string, a log,
  or storage, and act on it only after the person presses the button (link scanners load pages).
- Unconfirmed accounts can't sign in, so the workspace never waits for a confirmation. A `403 EMAIL_NOT_VERIFIED` can only
  reach a session started before that rule; the client reports it like an ended session (`onSessionEnded` in
  `src/lib/api/client.ts`), and the shell signs out on the server and opens `/login?reason=confirm-email`.
- A password change rotates the session's CSRF token: call `resetCsrf()`. A reset ends this browser's session: clear private
  state with `useClearPrivateState`.
- New-password fields use `autocomplete="new-password"` and `NEW_PASSWORD_HINT`; fields that re-check a password use
  `autocomplete="current-password"`.
- Links to the public website (Terms of use, Privacy policy) come from `src/lib/site.ts` (`NEXT_PUBLIC_SITE_URL`, fixed at
  build time) and open in the same tab.

## Security headers

- `src/proxy.ts` sets a nonce-based Content-Security-Policy on every page, and the root layout renders pages per request so
  Next.js can add the nonce to its scripts. Don't prerender pages, add inline `<script>` tags, or call other origins from
  the browser (`connect-src 'self'`). A third-party script would need the nonce and a policy change.
- Static headers (noindex, referrer, nosniff, framing, Permissions-Policy, opener policy) live in `next.config.ts`.
  Strict-Transport-Security is sent only when the server-only `APP_HTTPS=true` is set.
- `e2e/fixtures.ts` fails any end-to-end test that triggers a CSP or Permissions-Policy report. Import `test` and `expect`
  from it in new specs.

## Verification

```powershell
pnpm lint; pnpm typecheck; pnpm test; pnpm build
# End-to-end tests need Mailpit (mailpit --listen 127.0.0.1:8025 --smtp 127.0.0.1:1025) and the API started with
# ..\nextstep-api\scripts\run-api.ps1 -RelaxedLimits -Mailpit
pnpm test:e2e
pnpm perf         # optional Lighthouse lab check; needs the build and the API
```

Before a release, and after changing headers, cookies, proxy settings, or build configuration, run the production-like
staging check (README, "Production-like staging"):

```powershell
.\scripts\staging.ps1 start -Fresh; pnpm test:staging; .\scripts\staging.ps1 stop
```

In end-to-end tests, create accounts with `createAccount` (or `register`, `confirmEmail`, and `signIn`) from
`e2e/helpers.ts`, read emails through `e2e/mailpit.ts`, and give every account a password from `strongPassword()`. The
API refuses passwords found in Have I Been Pwned, so never use a fixed one. An account signs in only after
`confirmEmail`; check an expected refusal with `refusedSignIn`. Run `checkScreen` from `e2e/a11y.ts` (axe and 320 px)
on new screens, and check their keyboard path.

CI runs the same checks plus the end-to-end suite against nextstep-api `main` (`.github/workflows/ci.yml`).
`.github/workflows/security.yml` runs `pnpm audit --audit-level high`, OSV-Scanner, and gitleaks. Add an OSV exception to
`osv-scanner.toml` only with a reason and an expiry date.

gitleaks scans the full git history, so a key-like literal can't be removed once it's pushed. Never put token- or key-like
strings in code or tests; build fake tokens at runtime (for example `"t".repeat(43)`). `.gitleaksignore` lists only reviewed
findings, each with a comment. Run `gitleaks git . --redact` before pushing, and don't push if it reports anything.

Keep the `Dockerfile` building and serving (CI's image job checks it); the standalone output is set only through
`NEXT_OUTPUT=standalone` in the image build. Base images are pinned by digest; change the tag and digest together.

## Don'ts

- Don't add shadcn/ui or app code to the separate website repository.
- No production deployment or real personal data without an explicit request from the owner.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

