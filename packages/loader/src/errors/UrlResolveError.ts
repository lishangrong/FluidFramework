import { LoaderError } from "./LoaderError.js";
import { LoaderErrorCode } from "./LoaderErrorCode.js";

/**
 * URL 解析相关的错误。
 * UrlResolveFailed 可重试（可能是暂时性解析失败），
 * InvalidUrl 和 MissingContainerId 不可重试（输入本身有问题）。
 */
export class UrlResolveError extends LoaderError {
	constructor(
		message: string,
		errorCode:
			| LoaderErrorCode.InvalidUrl
			| LoaderErrorCode.UrlResolveFailed
			| LoaderErrorCode.MissingContainerId,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, errorCode, context, cause);
		this.name = "UrlResolveError";
	}

	override get retryable(): boolean {
		return this.errorCode === LoaderErrorCode.UrlResolveFailed;
	}
}
