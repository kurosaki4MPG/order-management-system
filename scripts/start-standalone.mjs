import { existsSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { pathToFileURL } from "node:url"

import dotenv from "dotenv"

const rootDir = process.cwd()
const envPath = path.join(rootDir, ".env.local")
const standaloneServerPath = path.join(rootDir, ".next", "standalone", "server.js")

if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

if (!existsSync(standaloneServerPath)) {
  throw new Error(
    ".next/standalone/server.js was not found. Run `npm run build` first.",
  )
}

await import(pathToFileURL(standaloneServerPath).href)
