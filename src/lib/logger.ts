type LogLevel = "info" | "warn" | "error" | "debug";

function getRequestId(): string | undefined {
  if (typeof window !== "undefined") {
    return (window as any).__request_id;
  }
  return undefined;
}

export const logger = {
  log(level: LogLevel, message: string, metadata?: Record<string, any>) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: getRequestId(),
      env: typeof window === "undefined" ? "server" : "client",
      ...metadata,
    };

    if (level === "error") {
      console.error(JSON.stringify(logEntry));
    } else if (level === "warn") {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  },
  info(message: string, metadata?: Record<string, any>) {
    this.log("info", message, metadata);
  },
  warn(message: string, metadata?: Record<string, any>) {
    this.log("warn", message, metadata);
  },
  error(message: string, error?: any, metadata?: Record<string, any>) {
    const errMeta = error
      ? {
          error: {
            message: error.message || String(error),
            stack: error.stack,
            code: error.code,
          },
        }
      : {};
    this.log("error", message, { ...errMeta, ...metadata });
  },
  debug(message: string, metadata?: Record<string, any>) {
    this.log("debug", message, metadata);
  },
};
