import { spawn } from "node:child_process"
import path from "node:path"
import process from "node:process"

const nextBinary = process.platform === "win32"
  ? path.join(process.cwd(), "node_modules", ".bin", "next.cmd")
  : path.join(process.cwd(), "node_modules", ".bin", "next")

const child = spawn(
  nextBinary,
  ["dev", "--webpack", "-H", "0.0.0.0"],
  {
    env: {
      ...process.env,
      LAN_SHARE: "1",
    },
    stdio: "inherit",
  },
)

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
