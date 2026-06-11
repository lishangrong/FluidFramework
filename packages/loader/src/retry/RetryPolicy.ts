import type {
	IRetryPolicy,
	IRetryDecision,
	IRetryPolicyOptions,
} from "../interfaces/IRetryPolicy.js";
import { LoaderError } from "../errors/LoaderError.js";
import { LoaderErrorCode } from "../errors/LoaderErrorCode.js";
import { ExponentialBackoff } from "./ExponentialBackoff.js";

const DEFAULT_OPTIONS: Required<IRetryPolicyOptions> = {
	maxRetries: 3,
	baseDelayMs: 1000,
	maxDelayMs: 30000,
	backoffFactor: 2,
	jitter: true,
	retryableErrorFilter: () => true,
};

/**
 * 重试策略实现。包装任意异步操作，提供指数退避重试。
 */
export class RetryPolicy implements IRetryPolicy {
	private readonly options: Required<IRetryPolicyOptions>;

	constructor(options?: Partial<IRetryPolicyOptions>) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	shouldRetry(error: Error, attemptNumber: number): IRetryDecision {
		if (attemptNumber > this.options.maxRetries) {
			return {
				shouldRetry: false,
				delayMs: 0,
				reason: `Max retries (${this.options.maxRetries}) exhausted`,
			};
		}

		if (!this.isRetryableError(error)) {
			return {
				shouldRetry: false,
				delayMs: 0,
				reason: `Error is not retryable: ${error.message}`,
			};
		}

		const delayMs = ExponentialBackoff.calculateDelay({
			attempt: attemptNumber,
			baseDelayMs: this.options.baseDelayMs,
			maxDelayMs: this.options.maxDelayMs,
			backoffFactor: this.options.backoffFactor,
			jitter: this.options.jitter,
		});

		return { shouldRetry: true, delayMs };
	}

	async execute<T>(
		operation: () => Promise<T>,
		operationName?: string,
	): Promise<T> {
		let lastError: Error | undefined;

		for (let attempt = 1; attempt <= this.options.maxRetries + 1; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError =
					error instanceof Error
						? error
						: new Error(String(error));

				const decision = this.shouldRetry(lastError, attempt);
				if (!decision.shouldRetry) {
					break;
				}

				await this.delay(decision.delayMs);
			}
		}

		throw new LoaderError(
			`Operation "${operationName ?? "unknown"}" failed after ${this.options.maxRetries} retries: ${lastError?.message}`,
			LoaderErrorCode.RetryExhausted,
			{
				operationName,
				maxRetries: this.options.maxRetries,
			},
			lastError,
		);
	}

	private isRetryableError(error: Error): boolean {
		// LoaderError 子类自行决定是否可重试
		if (error instanceof LoaderError) {
			return error.retryable;
		}
		// 其他错误通过自定义过滤器判断
		return this.options.retryableErrorFilter(error);
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
