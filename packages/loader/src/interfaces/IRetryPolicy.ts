/**
 * 重试策略接口。
 */
export interface IRetryPolicy {
	shouldRetry(error: Error, attemptNumber: number): IRetryDecision;
	execute<T>(
		operation: () => Promise<T>,
		operationName?: string,
	): Promise<T>;
}

export interface IRetryDecision {
	readonly shouldRetry: boolean;
	readonly delayMs: number;
	readonly reason?: string;
}

export interface IRetryPolicyOptions {
	readonly maxRetries: number;
	readonly baseDelayMs: number;
	readonly maxDelayMs: number;
	readonly backoffFactor: number;
	readonly jitter: boolean;
	readonly retryableErrorFilter?: (error: Error) => boolean;
}
