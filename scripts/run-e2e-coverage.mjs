import { spawn } from "node:child_process"
import { rm } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(rootDir, "..")
const coverageDir = resolve(projectRoot, ".playwright-coverage")
const appUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001"
const appPort = new URL(appUrl).port || "3001"
const npmBin = process.platform === "win32" ? "npm.cmd" : "npm"
const npxBin = process.platform === "win32" ? "npx.cmd" : "npx"

if (!process.env.PLAYWRIGHT_E2E_AUTH_BYPASS) {
  process.env.PLAYWRIGHT_E2E_AUTH_BYPASS = "1"
}

async function isServerReady() {
  try {
    const response = await fetch(appUrl, {
      method: "GET",
    })
    return response.ok || response.status < 500
  } catch {
    return false
  }
}

async function waitForServer(timeoutMs = 120_000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady()) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`Timed out waiting for ${appUrl}`)
}

async function ensureServer() {
  if (await isServerReady()) {
    return null
  }

  const serverProcess = spawn(
    npmBin,
    ["run", "dev", "--", "--hostname", "localhost", "--port", appPort],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
    }
  )

  let exited = false
  serverProcess.on("exit", () => {
    exited = true
  })

  await waitForServer()

  if (exited) {
    throw new Error("Next.js dev server exited before Playwright could start")
  }

  return serverProcess
}

async function runPlaywright() {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      npxBin,
      ["playwright", "test", "--project", "chromium"],
      {
        cwd: projectRoot,
        env: {
        ...process.env,
        PLAYWRIGHT_E2E_COVERAGE: "1",
        PLAYWRIGHT_E2E_AUTH_BYPASS: "1",
        PLAYWRIGHT_BASE_URL: appUrl,
        PLAYWRIGHT_WEB_SERVER: "0",
      },
        stdio: "inherit",
      }
    )

    child.on("error", rejectPromise)
    child.on("exit", (code) => {
      resolvePromise(code ?? 1)
    })
  })
}

await rm(coverageDir, { force: true, recursive: true })

const serverProcess = await ensureServer()
let playwrightExitCode = 0

try {
  playwrightExitCode = await runPlaywright()
} finally {
  if (serverProcess) {
    serverProcess.kill()
  }
}

await import("./collect-e2e-coverage.mjs")

if (playwrightExitCode !== 0) {
  process.exitCode = playwrightExitCode
}
