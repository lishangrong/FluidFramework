import { LoaderError } from "./LoaderError.js";
import { LoaderErrorCode } from "./LoaderErrorCode.js";

/**
 * 代码加载相关的错误。
 * CodeLoadFailed 和 ModuleNotFound 可重试（可能是暂时性网络问题），
 * InvalidModule 和 ModuleValidationFailed 不可重试（代码本身有问题）。
 */
export class CodeLoadError extends LoaderError {
	constructor(
		message: string,
		errorCode:
			| LoaderErrorCode.CodeLoadFailed
			| LoaderErrorCode.InvalidModule
			| LoaderErrorCode.ModuleNotFound
			| LoaderErrorCode.ModuleValidationFailed,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, errorCode, context, cause);
		this.name = "CodeLoadError";
	}

	override get retryable(): boolean {
		return (
			this.errorCode === LoaderErrorCode.CodeLoadFailed ||
			this.errorCode === LoaderErrorCode.ModuleNotFound
		);
	}
}
