/**
 * 指数退避计算器。纯函数，无状态。
 */
export class ExponentialBackoff {
	/**
	 * 计算第 n 次重试的延迟。
	 * delay = min(baseDelay * (factor ^ attempt), maxDelay) + jitter
	 */
	static calculateDelay(options: {
		attempt: number;
		baseDelayMs: number;
		maxDelayMs: number;
		backoffFactor: number;
		jitter: boolean;
	}): number {
		const rawDelay =
			options.baseDelayMs *
			Math.pow(options.backoffFactor, options.attempt - 1);
		const cappedDelay = Math.min(rawDelay, options.maxDelayMs);

		if (options.jitter) {
			const jitterAmount = ExponentialBackoff.calculateJitter(
				cappedDelay * 0.25,
			);
			return Math.floor(cappedDelay + jitterAmount);
		}

		return Math.floor(cappedDelay);
	}

	/**
	 * 生成 0 到 maxJitter 之间的随机抖动。
	 */
	static calculateJitter(maxJitter: number): number {
		return Math.random() * maxJitter;
	}
}
