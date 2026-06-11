import { ContainerErrorCode } from "./ContainerErrorCode.js";
import { ContainerError } from "./ContainerError.js";

type SchemaErrorCode =
	| ContainerErrorCode.InvalidSchema
	| ContainerErrorCode.UnknownDdsType
	| ContainerErrorCode.DuplicateInitialObject
	| ContainerErrorCode.DynamicTypeNotRegistered;

/**
 * Schema 相关错误。始终不可重试（配置类错误）。
 */
export class SchemaError extends ContainerError {
	constructor(
		message: string,
		errorCode: SchemaErrorCode,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, errorCode, context, cause);
		this.name = "SchemaError";
	}

	override get retryable(): boolean {
		return false;
	}
}
