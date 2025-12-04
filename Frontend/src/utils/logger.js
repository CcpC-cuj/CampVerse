/**
 * Production-safe logger utility
 * Disables all console output in production to prevent exposing application details
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

// Silent logger that does nothing
const noop = () => {};

// Logger that only works in development
const logger = {
  log: isDevelopment ? console.log.bind(console) : noop,
  warn: isDevelopment ? console.warn.bind(console) : noop,
  error: isDevelopment ? console.error.bind(console) : noop,
  info: isDevelopment ? console.info.bind(console) : noop,
  debug: isDevelopment ? console.debug.bind(console) : noop,
};

// Disable all console methods in production
if (!isDevelopment) {
  // Store original methods for potential debugging
  window.__originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };
  
  // Override console methods to prevent leaking info
  console.log = noop;
  console.warn = noop;
  console.error = noop;
  console.info = noop;
  console.debug = noop;
}

export default logger;
