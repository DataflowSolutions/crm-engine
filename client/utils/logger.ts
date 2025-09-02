// Development-only logging utility
// This helps reduce console spam in production while keeping debug info in development

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  // Debug logs - only in development
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  // Info logs - only in development
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  // Warning logs - always show
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  // Error logs - always show
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  // Performance timing
  time: (label: string) => {
    if (isDevelopment) {
      console.time(label);
    }
  },

  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  }
};

// Utility for timing operations
export const withTiming = async <T>(
  label: string, 
  operation: () => Promise<T>
): Promise<T> => {
  logger.time(label);
  try {
    const result = await operation();
    return result;
  } finally {
    logger.timeEnd(label);
  }
};
