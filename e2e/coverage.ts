/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture API uses a `use` callback but this file is not a React component. */
import { expect as baseExpect, test as base } from "@playwright/test"
import { promises as fs } from "node:fs"
import { relative, resolve } from "node:path"
import { createHash } from "node:crypto"

const coverageEnabled = process.env.PLAYWRIGHT_E2E_COVERAGE === "1"
const coverageDir = resolve(process.cwd(), ".playwright-coverage")

function makeSafeSlug(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function makeCoverageFileName(testFile: string, titlePath: string[]) {
  const title = titlePath.join(" > ")
  const hash = createHash("sha1").update(title).digest("hex").slice(0, 12)
  const fileName = `${makeSafeSlug(testFile)}-${makeSafeSlug(title)}-${hash}.json`

  return fileName.length > 160 ? `${fileName.slice(0, 160)}.json` : fileName
}

async function writeCoverage(
  entries: unknown,
  testFile: string,
  titlePath: string[],
  status: string | undefined,
  errors: Array<{ message?: string; stack?: string }>
) {
  await fs.mkdir(resolve(coverageDir, "raw"), { recursive: true })

  const fileName = makeCoverageFileName(testFile, titlePath)
  const targetPath = resolve(coverageDir, "raw", fileName)
  const projectRelativeFile = relative(process.cwd(), testFile)
  await fs.writeFile(
    targetPath,
    JSON.stringify(
      {
        coverage: entries,
        meta: {
          testFile,
          testFileRelative: projectRelativeFile,
          testTitlePath: titlePath,
          status: status ?? "unknown",
          errors: errors.map((error) => summarizeError(error)),
        },
      },
      null,
      2
    ),
    "utf8"
  )
}

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    if (!coverageEnabled) {
      await use(page)
      return
    }

    if (!page.coverage) {
      throw new Error(
        "Playwright JS coverage is only available in Chromium-based browsers."
      )
    }

    await page.coverage.startJSCoverage({
      reportAnonymousScripts: true,
      resetOnNavigation: false,
    })

    try {
      await use(page)
    } finally {
      const entries = await page.coverage.stopJSCoverage()
      await writeCoverage(
        entries,
        testInfo.file,
        testInfo.titlePath,
        testInfo.status,
        testInfo.errors
      )
    }
  },
})

export const expect = baseExpect

function summarizeError(error: { message?: string; stack?: string }) {
  const message = stripAnsi(error.message || error.stack || "unknown error").trim()
  const normalized = message.replace(/\n+/g, "<br>")

  return normalized.length > 1000 ? `${normalized.slice(0, 997)}...` : normalized
}

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, "")
}
