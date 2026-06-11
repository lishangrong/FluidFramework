/**
 * Fluid Loader - Retry Policy
 *
 * Implements exponential backoff with jitter and a circuit breaker pattern.
 * Used to handle transient failures in network operations.
 */

import {
  CircuitBreakerState,
  type IRetryOptions,
  type IRetryPolicy,
} from "./types";
import {
  CircuitBreakerOpenError,
  NetworkError,
  RetryExhaustedError,
} from "./errors";

/** Default retry configuration */
const DEFAULT_OPTIONS: Required<Omit<IRetryOptions, "onRetry" | "signal" | "isRetryable">> = {
  maxRetries: 3,
  baseDelay: 200,
  maxDelay: 10_000,
};

/** Default circuit breaker configuration */
const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_TIMEOUT_MS = 30_000;

/**
 * Default retryable error checker.
 * Retries on NetworkError and errors with 5xx status codes.
 */
function defaultIsRetryable(error: Error): boolean {
  if (error instanceof NetworkError) {
    // Retry on 5xx or connection errors (no status code)
    return error.statusCode === undefined || error.statusCode >= 500;
  }
  // Retry generic network-related errors
  const msg = error.message.toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("fetch failed")
  );
}

/**
 * Compute delay with exponential backoff and random jitter.
 * delay = min(baseDelay * 2^attempt + jitter, maxDelay)
 */
function computeBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponential = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay;
  return Math.min(exponential + jitter, maxDelay);
}

/** Sleep for a given duration, with abort signal support */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error("Aborted"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new Error("Aborted"));
      },
      { once: true },
    );
  });
}

export class RetryPolicy implements IRetryPolicy {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(
    failureThreshold: number = CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    resetTimeoutMs: number = CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
  ) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  getState(): CircuitBreakerState {
    // Check if open circuit breaker should transition to half-open
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = CircuitBreakerState.HALF_OPEN;
      }
    }
    return this.state;
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }

  async execute<T>(fn: () => Promise<T>, options?: IRetryOptions): Promise<T> {
    const opts = {
      ...DEFAULT_OPTIONS,
      ...options,
      isRetryable: options?.isRetryable ?? defaultIsRetryable,
    };

    // Check circuit breaker state
    const currentState = this.getState();
    if (currentState === CircuitBreakerState.OPEN) {
      throw new CircuitBreakerOpenError(this.lastFailureTime + this.resetTimeoutMs);
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      // Check abort signal before each attempt
      if (options?.signal?.aborted) {
        throw options.signal.reason ?? new Error("Aborted");
      }

      try {
        const result = await fn();

        // On success in HALF_OPEN state, close the circuit
        if (this.state === CircuitBreakerState.HALF_OPEN) {
          this.successCount++;
          if (this.successCount >= 1) {
            this.state = CircuitBreakerState.CLOSED;
            this.failureCount = 0;
          }
        } else if (this.state === CircuitBreakerState.CLOSED) {
          // Reset failure count on success
          this.failureCount = 0;
        }

        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        const isRetryable = opts.isRetryable(lastError);
        const hasRetriesLeft = attempt < opts.maxRetries;

        // Record failure for circuit breaker
        this.recordFailure();

        if (!isRetryable || !hasRetriesLeft) {
          // If circuit just opened mid-retry, let the caller know
          if (this.getState() === CircuitBreakerState.OPEN && hasRetriesLeft) {
            throw new CircuitBreakerOpenError(this.lastFailureTime + this.resetTimeoutMs);
          }
          break;
        }

        // Notify retry callback
        options?.onRetry?.(attempt + 1, lastError);

        // Wait before retrying with exponential backoff
        const delay = computeBackoff(attempt, opts.baseDelay, opts.maxDelay);
        await sleep(delay, options?.signal);
      }
    }

    throw new RetryExhaustedError(opts.maxRetries + 1, lastError!);
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in half-open goes back to open
      this.state = CircuitBreakerState.OPEN;
      this.successCount = 0;
    } else if (
      this.state === CircuitBreakerState.CLOSED &&
      this.failureCount >= this.failureThreshold
    ) {
      this.state = CircuitBreakerState.OPEN;
    }
  }
}
