const isDev = import.meta.env.DEV;

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_COLORS = {
  debug: "#888",
  info: "#4FC3F7",
  warn: "#FFB74D",
  error: "#EF5350",
} as const;

function formatMessage(level: LogLevel, prefix: string, message: string): string[] {
  if (!isDev) return [];
  return [`%c[${prefix}] ${message}`, `color: ${LOG_COLORS[level]}`];
}

export const logger = {
  debug: (prefix: string, message: string, ...args: unknown[]) => {
    if (isDev) console.log(...formatMessage("debug", prefix, message), ...args);
  },
  info: (prefix: string, message: string, ...args: unknown[]) => {
    if (isDev) console.info(...formatMessage("info", prefix, message), ...args);
  },
  warn: (prefix: string, message: string, ...args: unknown[]) => {
    console.warn(...formatMessage("warn", prefix, message), ...args);
  },
  error: (prefix: string, message: string, ...args: unknown[]) => {
    console.error(...formatMessage("error", prefix, message), ...args);
  },
};

export const webrtcLogger = {
  debug: (msg: string, ...args: unknown[]) => logger.debug("WebRTC", msg, ...args),
  info: (msg: string, ...args: unknown[]) => logger.info("WebRTC", msg, ...args),
  warn: (msg: string, ...args: unknown[]) => logger.warn("WebRTC", msg, ...args),
  error: (msg: string, ...args: unknown[]) => logger.error("WebRTC", msg, ...args),
};

export const authLogger = {
  debug: (msg: string, ...args: unknown[]) => logger.debug("Auth", msg, ...args),
  info: (msg: string, ...args: unknown[]) => logger.info("Auth", msg, ...args),
  warn: (msg: string, ...args: unknown[]) => logger.warn("Auth", msg, ...args),
  error: (msg: string, ...args: unknown[]) => logger.error("Auth", msg, ...args),
};

export const socketLogger = {
  debug: (msg: string, ...args: unknown[]) => logger.debug("Socket", msg, ...args),
  info: (msg: string, ...args: unknown[]) => logger.info("Socket", msg, ...args),
  warn: (msg: string, ...args: unknown[]) => logger.warn("Socket", msg, ...args),
  error: (msg: string, ...args: unknown[]) => logger.error("Socket", msg, ...args),
};
