import { copyFile, mkdir, readdir, stat } from "node:fs/promises"
import path from "node:path"

const rootDir = process.cwd()
const standaloneDir = path.join(rootDir, ".next", "standalone")
const publicDir = path.join(rootDir, "public")
const standalonePublicDir = path.join(standaloneDir, "public")
const staticDir = path.join(rootDir, ".next", "static")
const standaloneStaticDir = path.join(standaloneDir, ".next", "static")

async function pathExists(target) {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

async function copyDirectory(source, destination) {
  if (!(await pathExists(source))) {
    return
  }

  await mkdir(destination, { recursive: true })
  const entries = await readdir(source, { withFileTypes: true })

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name)
    const destinationPath = path.join(destination, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath)
      continue
    }

    if (entry.isFile()) {
      await mkdir(path.dirname(destinationPath), { recursive: true })
      await copyFile(sourcePath, destinationPath)
    }
  }
}

async function main() {
  if (!(await pathExists(standaloneDir))) {
    console.log("[copy-standalone-assets] .next/standalone not found; skip")
    return
  }

  await copyDirectory(publicDir, standalonePublicDir)
  await copyDirectory(staticDir, standaloneStaticDir)

  console.log("[copy-standalone-assets] copied public and .next/static into standalone")
}

main().catch((error) => {
  console.error("[copy-standalone-assets] failed:", error)
  process.exitCode = 1
})
