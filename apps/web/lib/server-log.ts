type LogLevel = 'info' | 'warn' | 'error'

const sensitiveKey =
  /email|token|secret|password|authorization|cookie|ip|host|path/i

export function redactLogFields(
  fields: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      sensitiveKey.test(key) ? '[redacted]' : value,
    ])
  )
}

export function serverLog(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {}
) {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...redactLogFields(fields),
  })
  if (level === 'error') console.error(record)
  else if (level === 'warn') console.warn(record)
  else console.info(record)
}
