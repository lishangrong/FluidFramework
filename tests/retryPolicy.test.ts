import { RetryPolicy } from "../src/retryPolicy";
import {
  CircuitBreakerState,
  type IRetryOptions,
} from "../src/types";
import {
  CircuitBreakerOpenError,
  NetworkError,
  RetryExhaustedError,
} from "../src/errors";

describe("RetryPolicy", () => {
  let policy: RetryPolicy;

  beforeEach(() => {
    policy = new RetryPolicy(3, 1000); // threshold=3, reset=1s
  });

  describe("successful execution", () => {
    it("should return result on first success", async () => {
      const result = await policy.execute(async () => 42);
      expect(result).toBe(42);
    });

    it("should retry and succeed after transient failure", async () => {
      let attempts = 0;
      const result = await policy.execute(
        async () => {
          attempts++;
          if (attempts < 2) throw new NetworkError("timeout");
          return "ok";
        },
        { baseDelay: 1, maxDelay: 10 },
      );

      expect(result).toBe("ok");
      expect(attempts).toBe(2);
    });
  });

  describe("retry exhaustion", () => {
    it("should throw RetryExhaustedError when all retries fail", async () => {
      await expect(
        policy.execute(
          async () => {
            throw new NetworkError("fail");
          },
          { maxRetries: 2, baseDelay: 1, maxDelay: 10 },
        ),
      ).rejects.toThrow(RetryExhaustedError);
    });

    it("should include attempt count in error", async () => {
      try {
        await policy.execute(
          async () => {
            throw new NetworkError("fail");
          },
          { maxRetries: 3, baseDelay: 1, maxDelay: 10 },
        );
      } catch (err) {
        expect(err).toBeInstanceOf(RetryExhaustedError);
        expect((err as RetryExhaustedError).attempts).toBe(4); // initial + 3 retries
      }
    });
  });

  describe("non-retryable errors", () => {
    it("should not retry non-retryable errors", async () => {
      let attempts = 0;
      await expect(
        policy.execute(
          async () => {
            attempts++;
            throw new Error("non-retryable error");
          },
          { maxRetries: 3, baseDelay: 1 },
        ),
      ).rejects.toThrow(RetryExhaustedError);

      expect(attempts).toBe(1);
    });

    it("should respect custom isRetryable", async () => {
      let attempts = 0;
      await expect(
        policy.execute(
          async () => {
            attempts++;
            throw new Error("custom error");
          },
          {
            maxRetries: 3,
            baseDelay: 1,
            isRetryable: () => true, // retry everything
          },
        ),
      ).rejects.toThrow(RetryExhaustedError);

      expect(attempts).toBe(4);
    });
  });

  describe("onRetry callback", () => {
    it("should call onRetry for each retry attempt", async () => {
      const retryAttempts: number[] = [];
      let attempts = 0;

      await expect(
        policy.execute(
          async () => {
            attempts++;
            throw new NetworkError("fail");
          },
          {
            maxRetries: 2,
            baseDelay: 1,
            maxDelay: 10,
            onRetry: (attempt) => retryAttempts.push(attempt),
          },
        ),
      ).rejects.toThrow();

      expect(retryAttempts).toEqual([1, 2]);
    });
  });

  describe("abort signal", () => {
    it("should abort on signal", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        policy.execute(async () => 42, { signal: controller.signal }),
      ).rejects.toThrow();
    });
  });

  describe("circuit breaker", () => {
    it("should start in CLOSED state", () => {
      expect(policy.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it("should open circuit after threshold failures", async () => {
      const opts: IRetryOptions = { maxRetries: 0, baseDelay: 1, isRetryable: () => true };

      for (let i = 0; i < 3; i++) {
        try {
          await policy.execute(async () => { throw new Error("fail"); }, opts);
        } catch {
          // expected
        }
      }

      expect(policy.getState()).toBe(CircuitBreakerState.OPEN);
    });

    it("should reject requests when circuit is open", async () => {
      const opts: IRetryOptions = { maxRetries: 0, baseDelay: 1, isRetryable: () => true };

      // Trip the circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await policy.execute(async () => { throw new Error("fail"); }, opts);
        } catch {
          // expected
        }
      }

      await expect(
        policy.execute(async () => "should not run"),
      ).rejects.toThrow(CircuitBreakerOpenError);
    });

    it("should transition to HALF_OPEN after reset timeout", async () => {
      const fastPolicy = new RetryPolicy(2, 50); // 50ms reset
      const opts: IRetryOptions = { maxRetries: 0, baseDelay: 1, isRetryable: () => true };

      // Trip the breaker
      for (let i = 0; i < 2; i++) {
        try {
          await fastPolicy.execute(async () => { throw new Error("fail"); }, opts);
        } catch {
          // expected
        }
      }

      expect(fastPolicy.getState()).toBe(CircuitBreakerState.OPEN);

      // Wait for reset timeout
      await new Promise((r) => setTimeout(r, 100));

      expect(fastPolicy.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    });

    it("should close circuit after success in HALF_OPEN", async () => {
      const fastPolicy = new RetryPolicy(2, 50);
      const opts: IRetryOptions = { maxRetries: 0, baseDelay: 1, isRetryable: () => true };

      // Trip the breaker
      for (let i = 0; i < 2; i++) {
        try {
          await fastPolicy.execute(async () => { throw new Error("fail"); }, opts);
        } catch {
          // expected
        }
      }

      await new Promise((r) => setTimeout(r, 100));

      // Succeed in half-open
      const result = await fastPolicy.execute(async () => "recovered");
      expect(result).toBe("recovered");
      expect(fastPolicy.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it("should reset circuit breaker state", () => {
      policy.reset();
      expect(policy.getState()).toBe(CircuitBreakerState.CLOSED);
    });
  });
});
