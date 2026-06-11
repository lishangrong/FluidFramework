import { describe, it, expect, vi } from "vitest";
import { ExponentialBackoff } from "../../src/retry/ExponentialBackoff.js";

describe("ExponentialBackoff", () => {
	it("should calculate exponentially increasing delays", () => {
		const opts = {
			baseDelayMs: 1000,
			maxDelayMs: 30000,
			backoffFactor: 2,
			jitter: false,
		};

		expect(
			ExponentialBackoff.calculateDelay({ ...opts, attempt: 1 }),
		).toBe(1000);
		expect(
			ExponentialBackoff.calculateDelay({ ...opts, attempt: 2 }),
		).toBe(2000);
		expect(
			ExponentialBackoff.calculateDelay({ ...opts, attempt: 3 }),
		).toBe(4000);
		expect(
			ExponentialBackoff.calculateDelay({ ...opts, attempt: 4 }),
		).toBe(8000);
	});

	it("should cap delay at maxDelayMs", () => {
		const delay = ExponentialBackoff.calculateDelay({
			attempt: 10,
			baseDelayMs: 1000,
			maxDelayMs: 5000,
			backoffFactor: 2,
			jitter: false,
		});

		expect(delay).toBe(5000);
	});

	it("should add jitter when enabled", () => {
		vi.spyOn(Math, "random").mockReturnValue(0.5);

		const delay = ExponentialBackoff.calculateDelay({
			attempt: 1,
			baseDelayMs: 1000,
			maxDelayMs: 30000,
			backoffFactor: 2,
			jitter: true,
		});

		// 1000 + (1000 * 0.25 * 0.5) = 1000 + 125 = 1125
		expect(delay).toBe(1125);

		vi.restoreAllMocks();
	});

	it("should produce jitter within range", () => {
		vi.spyOn(Math, "random").mockReturnValue(0);
		expect(ExponentialBackoff.calculateJitter(100)).toBe(0);

		vi.spyOn(Math, "random").mockReturnValue(1);
		expect(ExponentialBackoff.calculateJitter(100)).toBe(100);

		vi.restoreAllMocks();
	});
});
