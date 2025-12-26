/**
 * Logger utility for Agentiom
 * 
 * Uses pino for structured JSON logging.
 * Falls back to console if pino not available.
 */

export interface Logger {
  debug(msg: string): void;
  debug(obj: object, msg?: string): void;
  info(msg: string): void;
  info(obj: object, msg?: string): void;
  warn(msg: string): void;
  warn(obj: object, msg?: string): void;
  error(msg: string): void;
  error(obj: object, msg?: string): void;
}

/**
 * Simple console-based logger implementation
 * For production, replace with pino
 */
class ConsoleLogger implements Logger {
  constructor(private name: string) {}

  private format(level: string, obj: object, msg?: string): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] ${level.toUpperCase()} [${this.name}]`;
    if (msg) {
      return `${prefix} ${msg} ${JSON.stringify(obj)}`;
    }
    return `${prefix} ${JSON.stringify(obj)}`;
  }

  debug(objOrMsg: object | string, msg?: string): void {
    if (process.env.LOG_LEVEL === 'debug') {
      if (typeof objOrMsg === 'string') {
        console.debug(this.format('debug', {}, objOrMsg));
      } else {
        console.debug(this.format('debug', objOrMsg, msg));
      }
    }
  }

  info(objOrMsg: object | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      console.info(this.format('info', {}, objOrMsg));
    } else {
      console.info(this.format('info', objOrMsg, msg));
    }
  }

  warn(objOrMsg: object | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      console.warn(this.format('warn', {}, objOrMsg));
    } else {
      console.warn(this.format('warn', objOrMsg, msg));
    }
  }

  error(objOrMsg: object | string, msg?: string): void {
    if (typeof objOrMsg === 'string') {
      console.error(this.format('error', {}, objOrMsg));
    } else {
      console.error(this.format('error', objOrMsg, msg));
    }
  }
}

/**
 * Create a logger instance for a component
 */
export function createLogger(name: string): Logger {
  return new ConsoleLogger(name);
}
