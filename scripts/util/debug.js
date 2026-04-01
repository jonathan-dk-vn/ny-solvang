const DEBUG_KEY = 'debug';

function isDebugEnabled() {
  if (typeof window === 'undefined') return false;
  if (typeof window.__DEBUG_LOG__ !== 'undefined') {
    return window.__DEBUG_LOG__;
  }
  let enabled = false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('debug')) {
      const val = params.get('debug');
      enabled = val === '' || val === null || val === '1' || val.toLowerCase() === 'true';
      window.localStorage.setItem(DEBUG_KEY, enabled ? '1' : '0');
    } else {
      const stored = window.localStorage.getItem(DEBUG_KEY);
      enabled = stored === '1' || stored === 'true';
    }
  } catch (e) {
    enabled = false;
  }
  window.__DEBUG_LOG__ = enabled;
  return enabled;
}

export function debugLog(...args) {
  let level = 'log';
  if (typeof args[0] === 'string' && ['log', 'warn', 'error'].includes(args[0])) {
    level = args.shift();
  }
  const isProd = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
  if (!isProd || isDebugEnabled()) {
    const logger = console[level] || console.log;
    logger(...args);
  }
}

debugLog.log = (...args) => debugLog('log', ...args);
debugLog.warn = (...args) => debugLog('warn', ...args);
debugLog.error = (...args) => debugLog('error', ...args);

if (typeof window !== 'undefined') {
  window.debugLog = debugLog;
}

export default debugLog;
