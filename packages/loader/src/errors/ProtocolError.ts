import { LoaderError } from "./LoaderError.js";
import { LoaderErrorCode } from "./LoaderErrorCode.js";

/**
 * 协议相关的错误：协议未注册、已注册、不匹配等。
 * 协议错误始终不可重试（属于配置错误）。
 */
export class ProtocolError extends LoaderError {
	constructor(
		message: string,
		errorCode:
			| LoaderErrorCode.ProtocolNotRegistered
			| LoaderErrorCode.ProtocolAlreadyRegistered
			| LoaderErrorCode.ProtocolMismatch,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, errorCode, context, cause);
		this.name = "ProtocolError";
	}

	override get retryable(): boolean {
		return false;
	}
}
