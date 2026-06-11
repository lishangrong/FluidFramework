import { describe, it, expect, vi } from "vitest";
import { RetryPolicy } from "../../src/retry/RetryPolicy.js";
import { LoaderError } from "../../src/errors/LoaderError.js";
import { LoaderErrorCode } from "../../src/errors/LoaderErrorCode.js";
import { CodeLoadError } from "../../src/errors/CodeLoadError.js";
import { ProtocolError } from "../../src/errors/ProtocolError.js";

describe("RetryPolicy", () => {
	describe("shouldRetry", () => {
		it("should allow retry when under max retries", () => {
			const policy = new RetryPolicy({
				maxRetries: 3,
				jitter: false,
			});

			const decision = policy.shouldRetry(new Error("transient"), 1);
			expect(decision.shouldRetry).toBe(true);
			expect(decision.delayMs).toBeGreaterThan(0);
		});

		it("should deny retry when max retries reached", () => {
			const policy = new RetryPolicy({ maxRetries: 3 });

			const decision = policy.shouldRetry(new Error("fail"), 4);
			expect(decision.shouldRetry).toBe(false);
		});

		it("should deny retry for non-retryable LoaderError", () => {
			const policy = new RetryPolicy({ maxRetries: 3 });
			const error = new ProtocolError(
				"not registered",
				LoaderErrorCode.ProtocolNotRegistered,
			);

			const decision = policy.shouldRetry(error, 1);
			expect(decision.shouldRetry).toBe(false);
		});

		it("should allow retry for retryable LoaderError", () => {
			const policy = new RetryPolicy({
				maxRetries: 3,
				jitter: false,
			});
			const error = new CodeLoadError(
				"fetch failed",
				LoaderErrorCode.CodeLoadFailed,
			);

			const decision = policy.shouldRetry(error, 1);
			expect(decision.shouldRetry).toBe(true);
		});
	});

	describe("execute", () => {
		it("should return result on first success", async () => {
			const policy = new RetryPolicy({ maxRetries: 3 });
			const op = vi.fn().mockResolvedValue("ok");

			const result = await policy.execute(op, "test-op");
			expect(result).toBe("ok");
			expect(op).toHaveBeenCalledTimes(1);
		});

		it("should retry and succeed on later attempt", async () => {
			const policy = new RetryPolicy({
				maxRetries: 3,
				baseDelayMs: 1,
				jitter: false,
			});

			const op = vi
				.fn()
				.mockRejectedValueOnce(new Error("fail-1"))
				.mockRejectedValueOnce(new Error("fail-2"))
				.mockResolvedValue("success");

			const result = await policy.execute(op);
			expect(result).toBe("success");
			expect(op).toHaveBeenCalledTimes(3);
		});

		it("should throw RetryExhausted after max retries", async () => {
			const policy = new RetryPolicy({
				maxRetries: 2,
				baseDelayMs: 1,
				jitter: false,
			});

			const op = vi.fn().mockRejectedValue(new Error("always fails"));

			await expect(policy.execute(op, "failing-op")).rejects.toThrow(
				LoaderError,
			);
			expect(op).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
		});

		it("should not retry non-retryable errors", async () => {
			const policy = new RetryPolicy({
				maxRetries: 3,
				baseDelayMs: 1,
			});

			const error = new ProtocolError(
				"config error",
				LoaderErrorCode.ProtocolNotRegistered,
			);
			const op = vi.fn().mockRejectedValue(error);

			await expect(policy.execute(op)).rejects.toThrow(LoaderError);
			expect(op).toHaveBeenCalledTimes(1);
		});

		it("should respect custom retryableErrorFilter", async () => {
			const policy = new RetryPolicy({
				maxRetries: 3,
				baseDelayMs: 1,
				jitter: false,
				retryableErrorFilter: (err) =>
					err.message.includes("transient"),
			});

			const op = vi
				.fn()
				.mockRejectedValue(new Error("permanent error"));

			await expect(policy.execute(op)).rejects.toThrow();
			expect(op).toHaveBeenCalledTimes(1);
		});
	});
});
