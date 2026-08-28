/**
 * Centralized logging utility for RepairReach frontend.
 *
 * Gated strictly on `import.meta.env.DEV`.
 * In production builds (import.meta.env.PROD === true / import.meta.env.DEV === false),
 * all logging methods are no-ops to ensure no internal technical details,
 * stack traces, or sensitive error objects are exposed in browser DevTools.
 */

const isDev = (): boolean => {
  return Boolean(import.meta.env?.DEV);
};

export const logger = {
  /**
   * Log debug messages (development mode only).
   */
  debug: (...args: unknown[]): void => {
    if (isDev()) {
      console.debug(...args);
    }
  },

  /**
   * Log informational messages (development mode only).
   */
  info: (...args: unknown[]): void => {
    if (isDev()) {
      console.info(...args);
    }
  },

  /**
   * Log warning messages (development mode only).
   */
  warn: (...args: unknown[]): void => {
    if (isDev()) {
      console.warn(...args);
    }
  },

  /**
   * Log error messages (development mode only).
   */
  error: (...args: unknown[]): void => {
    if (isDev()) {
      console.error(...args);
    }
  },

  /**
   * General log output alias (development mode only).
   */
  log: (...args: unknown[]): void => {
    if (isDev()) {
      console.log(...args);
    }
  },
};

export default logger;
