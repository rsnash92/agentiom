/**
 * Resilience Module
 * Implements retry logic and circuit breaker patterns for API calls
 * - Exponential backoff retry
 * - Circuit breaker for failing services
 * - Timeout handling
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number; // ms before allowing retry after opening
}

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number;
  lastAttempt: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'rate_limit',
    'timeout',
    '429',
    '500',
    '502',
    '503',
    '504',
  ],
};

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
};

// Circuit breaker state storage (in-memory, per-service)
const circuitBreakers = new Map<string, CircuitBreakerState>();

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context?: string
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const isRetryable = cfg.retryableErrors.some(
        (e) =>
          lastError!.message.includes(e) ||
          lastError!.name.includes(e) ||
          (lastError as unknown as Record<string, unknown>)?.code === e
      );

      if (!isRetryable || attempt === cfg.maxRetries) {
        console.error(
          `[Retry] ${context || 'Operation'} failed after ${attempt + 1} attempts:`,
          lastError.message
        );
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        cfg.initialDelayMs * Math.pow(cfg.backoffMultiplier, attempt),
        cfg.maxDelayMs
      );

      console.log(
        `[Retry] ${context || 'Operation'} failed (attempt ${attempt + 1}/${cfg.maxRetries + 1}), retrying in ${delay}ms...`
      );

      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed without error');
}

/**
 * Execute a function with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  serviceName: string,
  fn: () => Promise<T>,
  config: Partial<CircuitBreakerConfig> = {}
): Promise<T> {
  const cfg = { ...DEFAULT_CIRCUIT_CONFIG, ...config };

  // Get or initialize circuit state
  let state = circuitBreakers.get(serviceName);
  if (!state) {
    state = {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailure: 0,
      lastAttempt: 0,
    };
    circuitBreakers.set(serviceName, state);
  }

  // Check circuit state
  if (state.state === 'open') {
    const timeSinceLastFailure = Date.now() - state.lastFailure;

    if (timeSinceLastFailure < cfg.timeout) {
      throw new CircuitBreakerError(
        `Circuit breaker open for ${serviceName}. Retry in ${Math.ceil((cfg.timeout - timeSinceLastFailure) / 1000)}s`
      );
    }

    // Transition to half-open
    state.state = 'half-open';
    state.successes = 0;
    console.log(`[Circuit] ${serviceName}: transitioning to half-open`);
  }

  state.lastAttempt = Date.now();

  try {
    const result = await fn();

    // Success handling
    if (state.state === 'half-open') {
      state.successes++;
      if (state.successes >= cfg.successThreshold) {
        state.state = 'closed';
        state.failures = 0;
        console.log(`[Circuit] ${serviceName}: circuit closed`);
      }
    } else {
      state.failures = 0; // Reset failures on success
    }

    return result;
  } catch (error) {
    state.failures++;
    state.lastFailure = Date.now();

    if (state.state === 'half-open') {
      // Immediate re-open on failure in half-open state
      state.state = 'open';
      console.log(`[Circuit] ${serviceName}: reopened after half-open failure`);
    } else if (state.failures >= cfg.failureThreshold) {
      state.state = 'open';
      console.log(
        `[Circuit] ${serviceName}: opened after ${state.failures} failures`
      );
    }

    throw error;
  }
}

/**
 * Combine retry with circuit breaker
 */
export async function withResilience<T>(
  serviceName: string,
  fn: () => Promise<T>,
  options: {
    retry?: Partial<RetryConfig>;
    circuit?: Partial<CircuitBreakerConfig>;
  } = {}
): Promise<T> {
  return withCircuitBreaker(serviceName, () => withRetry(fn, options.retry, serviceName), options.circuit);
}

/**
 * Execute with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  context?: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new TimeoutError(`${context || 'Operation'} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Get circuit breaker status for a service
 */
export function getCircuitStatus(serviceName: string): CircuitBreakerState | null {
  return circuitBreakers.get(serviceName) || null;
}

/**
 * Reset circuit breaker for a service
 */
export function resetCircuit(serviceName: string): void {
  circuitBreakers.delete(serviceName);
  console.log(`[Circuit] ${serviceName}: reset`);
}

/**
 * Get all circuit breaker statuses
 */
export function getAllCircuitStatuses(): Record<string, CircuitBreakerState> {
  const statuses: Record<string, CircuitBreakerState> = {};
  circuitBreakers.forEach((state, name) => {
    statuses[name] = { ...state };
  });
  return statuses;
}

// Custom error types
export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Helper
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Decorator-style wrapper for class methods
 */
export function resilient(
  serviceName: string,
  options?: {
    retry?: Partial<RetryConfig>;
    circuit?: Partial<CircuitBreakerConfig>;
    timeout?: number;
  }
) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      let fn = () => originalMethod.apply(this, args);

      // Apply timeout if specified
      if (options?.timeout) {
        const timeoutFn = fn;
        fn = () => withTimeout(timeoutFn, options.timeout!, `${serviceName}.${propertyKey}`);
      }

      return withResilience(`${serviceName}.${propertyKey}`, fn, {
        retry: options?.retry,
        circuit: options?.circuit,
      });
    } as T;

    return descriptor;
  };
}
