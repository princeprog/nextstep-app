// Lighthouse lab check of the production build with Lighthouse's default mobile emulation
// (simulated slow 4G and 4x CPU slowdown).
//
//   pnpm build
//   pnpm perf                 # one run per page
//   PERF_RUNS=3 pnpm perf     # median of three runs per page
//
// Pages: /login, /register, /demo, and /dashboard signed in to a new demo workspace. The demo is started through
// the API's CSRF flow and its session cookie is passed to Lighthouse as an extra request header, so the API must be
// running (see README). An already running server at PERF_BASE_URL (default http://localhost:3000) is reused;
// otherwise the script runs "next start" for the measurement and stops it afterwards.
//
// Chrome is found automatically. On Windows the script falls back to Microsoft Edge; set CHROME_PATH to choose
// another Chromium-based browser. Reports are written to lighthouse-reports/ (git-ignored). Lab numbers depend on
// the machine, so this is a local check and is not part of CI.
import { spawn } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const baseUrl = new URL(process.env.PERF_BASE_URL ?? "http://localhost:3000")
const runs = Math.max(1, Number.parseInt(process.env.PERF_RUNS ?? "1", 10) || 1)

const PAGES = [
  { path: "/login", signedIn: false },
  { path: "/register", signedIn: false },
  { path: "/demo", signedIn: false },
  { path: "/dashboard", signedIn: true },
]

/** Lighthouse's "good" thresholds for mobile; values above them are flagged. */
const BUDGETS = { lcp: 2500, cls: 0.1, tbt: 200, fcp: 1800, si: 3400 }

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

function fail(message) {
  console.error("perf: " + message)
  process.exit(1)
}

function browserPath() {
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH
  }
  if (process.platform !== "win32") {
    return undefined // chrome-launcher finds Chrome or Chromium on macOS and Linux.
  }
  const programFiles = process.env.PROGRAMFILES ?? "C:\\Program Files"
  const programFilesX86 = process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)"
  return [
    join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
    join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
    join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
    join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
  ].find((path) => existsSync(path))
}

async function isUp() {
  try {
    const response = await fetch(new URL("/login", baseUrl), { redirect: "manual" })
    return response.status < 500
  } catch {
    return false
  }
}

/** Reuses a running server, or starts the production build when measuring localhost. */
async function ensureServer() {
  if (await isUp()) {
    return null
  }
  if (!["localhost", "127.0.0.1"].includes(baseUrl.hostname)) {
    fail(baseUrl.origin + " is not reachable.")
  }
  if (!existsSync(join(root, ".next", "BUILD_ID"))) {
    fail("No production build found. Run pnpm build first.")
  }
  const port = baseUrl.port || "80"
  const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--port", port], {
    cwd: root,
    stdio: "ignore",
  })
  for (let attempt = 0; attempt < 120; attempt++) {
    if (await isUp()) {
      return server
    }
    if (server.exitCode !== null) {
      fail("next start exited with code " + server.exitCode + ".")
    }
    await sleep(500)
  }
  server.kill()
  fail("next start did not answer within 60 seconds.")
}

/** Starts a demo through the app origin (CSRF token first, then POST /auth/demo) and returns its cookie header. */
async function startDemoSession() {
  const jar = new Map()
  const remember = (response) => {
    for (const line of response.headers.getSetCookie()) {
      const [pair, ...attributes] = line.split(";")
      const separator = pair.indexOf("=")
      const name = pair.slice(0, separator).trim()
      if (attributes.some((attribute) => /^\s*max-age=0\s*$/i.test(attribute))) {
        jar.delete(name)
      } else {
        jar.set(name, pair.slice(separator + 1).trim())
      }
    }
  }
  const cookie = () => [...jar].map(([name, value]) => name + "=" + value).join("; ")

  const csrfResponse = await fetch(new URL("/api/v1/auth/csrf", baseUrl), { headers: { Accept: "application/json" } })
  if (!csrfResponse.ok) {
    throw new Error("GET /api/v1/auth/csrf returned " + csrfResponse.status + ". Is the API running?")
  }
  remember(csrfResponse)
  const csrf = await csrfResponse.json()
  const demoResponse = await fetch(new URL("/api/v1/auth/demo", baseUrl), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: baseUrl.origin,
      Cookie: cookie(),
      [csrf.headerName]: csrf.token,
    },
    body: JSON.stringify({ timeZone: "UTC" }),
  })
  if (!demoResponse.ok) {
    throw new Error("POST /api/v1/auth/demo returned " + demoResponse.status + ": " + (await demoResponse.text()))
  }
  remember(demoResponse)
  return cookie()
}

function runLighthouse(url, outputBase, extraHeaders, env) {
  const args = [
    require.resolve("lighthouse/cli/index.js"),
    url,
    "--output=json",
    "--output=html",
    "--output-path=" + outputBase,
    "--chrome-flags=--headless=new",
    "--quiet",
  ]
  if (extraHeaders) {
    args.push("--extra-headers=" + JSON.stringify(extraHeaders))
  }
  return new Promise((done) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: ["ignore", "ignore", "pipe"] })
    let stderr = ""
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("close", (code) => done({ code, stderr }))
  })
}

function readResult(outputBase) {
  const file = outputBase + ".report.json"
  if (!existsSync(file)) {
    return null
  }
  const lhr = JSON.parse(readFileSync(file, "utf8"))
  if (lhr.runtimeError) {
    throw new Error(lhr.runtimeError.code + ": " + lhr.runtimeError.message)
  }
  const score = (id) => Math.round((lhr.categories[id]?.score ?? 0) * 100)
  const metric = (id) => lhr.audits[id]?.numericValue ?? Number.NaN
  return {
    finalUrl: lhr.finalDisplayedUrl,
    performance: score("performance"),
    accessibility: score("accessibility"),
    bestPractices: score("best-practices"),
    seo: score("seo"),
    lcp: metric("largest-contentful-paint"),
    cls: metric("cumulative-layout-shift"),
    tbt: metric("total-blocking-time"),
    fcp: metric("first-contentful-paint"),
    si: metric("speed-index"),
  }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function summarize(results) {
  const keys = ["performance", "accessibility", "bestPractices", "seo", "lcp", "cls", "tbt", "fcp", "si"]
  return Object.fromEntries(keys.map((key) => [key, median(results.map((result) => result[key]))]))
}

const seconds = (ms) => (ms / 1000).toFixed(2) + " s"
const flag = (value, budget) => (value > budget ? " !" : "")

function printTable(rows) {
  const header = ["Page", "Perf", "A11y", "BP", "SEO", "LCP", "CLS", "TBT", "FCP", "Speed Index"]
  const lines = rows.map(({ path, summary: s, error }) =>
    error
      ? [path, "failed: " + error]
      : [
          path,
          String(s.performance),
          String(s.accessibility),
          String(s.bestPractices),
          String(s.seo),
          seconds(s.lcp) + flag(s.lcp, BUDGETS.lcp),
          s.cls.toFixed(3) + flag(s.cls, BUDGETS.cls),
          Math.round(s.tbt) + " ms" + flag(s.tbt, BUDGETS.tbt),
          seconds(s.fcp) + flag(s.fcp, BUDGETS.fcp),
          seconds(s.si) + flag(s.si, BUDGETS.si),
        ],
  )
  const widths = header.map((title, column) => Math.max(title.length, ...lines.map((line) => (line[column] ?? "").length)))
  const format = (line) => line.map((cell, column) => cell.padEnd(widths[column])).join("  ").trimEnd()
  console.log(format(header))
  lines.forEach((line) => console.log(format(line)))
  console.log(
    "\n! = slower than Lighthouse's mobile 'good' threshold (LCP 2.5 s, CLS 0.1, TBT 200 ms, FCP 1.8 s, Speed Index 3.4 s).",
  )
  console.log("SEO is expected to be low: every app page is deliberately noindex.")
}

const chrome = browserPath()
const env = chrome ? { ...process.env, CHROME_PATH: chrome } : process.env
const stamp = new Date().toISOString().replace(/[:.]/g, "-")
const reportDir = join(root, "lighthouse-reports", stamp)
mkdirSync(reportDir, { recursive: true })

const server = await ensureServer()
console.log("Measuring " + baseUrl.origin + (server ? " (started next start)" : " (existing server)") + " with " +
  (chrome ?? "the default Chrome") + ", " + runs + " run(s) per page.\n")

const rows = []
try {
  let cookie = null
  for (const page of PAGES) {
    const results = []
    let error = null
    try {
      if (page.signedIn && !cookie) {
        cookie = await startDemoSession()
      }
      for (let run = 1; run <= runs; run++) {
        const name = page.path.replace(/^\//, "").replace(/\//g, "-") || "home"
        const outputBase = join(reportDir, name + (runs > 1 ? "-" + run : ""))
        const { code, stderr } = await runLighthouse(new URL(page.path, baseUrl).href, outputBase,
          page.signedIn ? { Cookie: cookie } : null, env)
        const result = readResult(outputBase)
        if (!result) {
          throw new Error("Lighthouse exited with code " + code + ". " + stderr.trim().split("\n").slice(-3).join(" "))
        }
        if (page.signedIn && !new URL(result.finalUrl).pathname.startsWith(page.path)) {
          throw new Error("ended on " + result.finalUrl + " instead of the signed-in page")
        }
        results.push(result)
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause)
    }
    rows.push({ path: page.path, runs: results, summary: results.length ? summarize(results) : null, error })
  }
} finally {
  server?.kill()
}

writeFileSync(join(reportDir, "summary.json"), JSON.stringify({ baseUrl: baseUrl.origin, runs, pages: rows }, null, 2))
printTable(rows)
console.log("\nReports: " + reportDir)
if (rows.some((row) => row.error)) {
  process.exitCode = 1
}
