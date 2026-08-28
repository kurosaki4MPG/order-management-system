import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { resolve, dirname, basename } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { parse as parseAcorn } from "acorn"
import { convert } from "ast-v8-to-istanbul"
import coveragePkg from "istanbul-lib-coverage"
import reportPkg from "istanbul-lib-report"
import reportsPkg from "istanbul-reports"

const { createCoverageMap } = coveragePkg
const { createContext } = reportPkg
const reports = reportsPkg

const rootDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(rootDir, "..")
const coverageRoot = resolve(projectRoot, ".playwright-coverage")
const rawDir = resolve(coverageRoot, "raw")
const reportDir = resolve(coverageRoot, "report")
const keepRawCoverage = process.env.PLAYWRIGHT_E2E_COVERAGE_KEEP_RAW === "1"

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(entryPath)))
    } else {
      files.push(entryPath)
    }
  }

  return files
}

async function convertEntry(entry) {
  if (!entry?.source || !entry?.url) {
    return null
  }

  const virtualFilePath = resolve(
    coverageRoot,
    "virtual",
    `${basename(new URL(entry.url).pathname || "script.js")}`
  )
  const coverageUrl = pathToFileURL(virtualFilePath).href

  try {
    const parsed = parseAcorn(entry.source, {
      ecmaVersion: "latest",
      sourceType: "module",
    })

    return await convert({
      ast: Promise.resolve(parsed),
      code: entry.source,
      coverage: {
        ...entry,
        url: coverageUrl,
      },
      wrapperLength: 0,
    })
  } catch {
    try {
      const parsed = parseAcorn(entry.source, {
        ecmaVersion: "latest",
        sourceType: "script",
      })

      return await convert({
        ast: Promise.resolve(parsed),
        code: entry.source,
        coverage: {
          ...entry,
          url: coverageUrl,
        },
        wrapperLength: 0,
      })
    } catch (error) {
      console.warn(`Skipping coverage entry for ${entry.url}:`, error instanceof Error ? error.message : error)
      return null
    }
  }
}

async function main() {
  const rawFiles = await walk(rawDir).catch(() => [])
  const coverageMap = createCoverageMap({})
  const caseRowsByFile = new Map()

  for (const rawFile of rawFiles) {
    if (!rawFile.endsWith(".json")) {
      continue
    }

    const text = await readFile(rawFile, "utf8")
    const parsed = JSON.parse(text)
    const entries = Array.isArray(parsed) ? parsed : parsed.coverage ?? []
    const meta = Array.isArray(parsed) ? null : parsed.meta ?? null
    const appEntries = entries.filter((entry) =>
      typeof entry?.source === "string" && entry.source.includes("[project]/src/")
    )

    for (const entry of appEntries) {
      const converted = await convertEntry(entry)
      if (converted) {
        coverageMap.merge(converted)
      }
    }

    if (meta?.testFile || meta?.testTitlePath) {
      const file = meta.testFileRelative ?? meta.testFile ?? "unknown"
      const rows = caseRowsByFile.get(file) ?? []
      rows.push({
        errors: Array.isArray(meta.errors) ? meta.errors : [],
        result: summarizeResult(meta.status),
        title: Array.isArray(meta.testTitlePath)
          ? meta.testTitlePath.join(" > ")
          : "unknown",
      })
      caseRowsByFile.set(file, rows)
    }
  }

  await rm(reportDir, { force: true, recursive: true })
  await mkdir(reportDir, { recursive: true })

  const context = createContext({
    coverageMap,
    dir: reportDir,
  })

  reports.create("text").execute(context)
  reports.create("json-summary").execute(context)

  const summaryPath = resolve(reportDir, "coverage-summary.json")
  const summary = coverageMap.getCoverageSummary().toJSON()
  await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8")

  const caseSummaryLines = [
    "# Playwright E2E Coverage Cases",
    "",
    "",
  ]

  for (const [file, rows] of [...caseRowsByFile.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    caseSummaryLines.push(`## ${file}`)
    caseSummaryLines.push("")
    caseSummaryLines.push("| Test Case | Result | Error |")
    caseSummaryLines.push("| --- | --- | --- |")

    for (const row of rows.sort((left, right) => left.title.localeCompare(right.title))) {
      caseSummaryLines.push(
        `| ${escapeCell(row.title)} | ${escapeCell(row.result)} | ${escapeCell(
          row.errors.length > 0 ? row.errors.join("<br>") : "-"
        )} |`
      )
    }

    caseSummaryLines.push("")
  }

  await writeFile(
    resolve(reportDir, "case-summary.md"),
    caseSummaryLines.join("\n"),
    "utf8"
  )

  if (!keepRawCoverage) {
    await rm(rawDir, { force: true, recursive: true })
  }
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|")
}

function summarizeResult(status) {
  if (status === "passed") {
    return "PASS"
  }

  if (status === "failed") {
    return "FAIL"
  }

  if (status === "timedOut") {
    return "TIMEOUT"
  }

  if (status === "skipped") {
    return "SKIP"
  }

  if (status === "interrupted") {
    return "INTERRUPTED"
  }

  return "UNKNOWN"
}

await main()
