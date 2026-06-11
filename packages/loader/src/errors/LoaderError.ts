import { LoaderErrorCode } from "./LoaderErrorCode.js";

/**
 * 所有 Loader 错误的基类。
 * 提供错误码、时间戳、上下文信息和可重试性判断。
 */
export class LoaderError extends Error {
	public readonly errorCode: LoaderErrorCode;
	public readonly timestamp: number;
	public readonly context?: Record<string, unknown>;

	constructor(
		message: string,
		errorCode: LoaderErrorCode,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, { cause });
		this.name = "LoaderError";
		this.errorCode = errorCode;
		this.timestamp = Date.now();
		this.context = context;
	}

	/**
	 * 此错误是否可重试。子类可覆盖此属性。
	 */
	get retryable(): boolean {
		return false;
	}
}
