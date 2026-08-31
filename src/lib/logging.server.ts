// CloudWatch Logs で追いやすいように、1行 JSON の構造化ログを出す。
// requestId / eventId / orderId / userId を共通フィールドに揃える。

export type LogLevel = "debug" | "error" | "info" | "warn"

export type LogContext = {
  detailType?: string
  eventId?: string
  orderId?: string
  requestId?: string
  step?: string
  userId?: string
  workflow?: string
  [key: string]: unknown
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    }
  }

  return {
    message: String(error),
    name: "UnknownError",
  }
}

function emitLog(
  level: LogLevel,
  message: string,
  context: LogContext = {},
  error?: unknown
) {
  const payload = {
    level,
    message,
    ...context,
    ...(error === undefined ? {} : { error: serializeError(error) }),
  }

  console.log(JSON.stringify(payload))
}

export function logInfo(message: string, context?: LogContext) {
  emitLog("info", message, context)
}

export function logWarn(message: string, context?: LogContext) {
  emitLog("warn", message, context)
}

export function logError(
  message: string,
  error?: unknown,
  context?: LogContext
) {
  emitLog("error", message, context, error)
}
