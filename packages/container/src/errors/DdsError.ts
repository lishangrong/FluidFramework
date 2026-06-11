import { ContainerErrorCode } from "./ContainerErrorCode.js";
import { ContainerError } from "./ContainerError.js";

type DdsErrorCode =
	| ContainerErrorCode.DdsNotFound
	| ContainerErrorCode.DdsAlreadyExists
	| ContainerErrorCode.DdsOperationFailed
	| ContainerErrorCode.DdsDisposed
	| ContainerErrorCode.InvalidOperation
	| ContainerErrorCode.TreeNodeNotFound
	| ContainerErrorCode.TreeInvalidNodeType
	| ContainerErrorCode.TreeCycleDetected
	| ContainerErrorCode.TreeTransactionConflict
	| ContainerErrorCode.TreeTransactionEnded
	| ContainerErrorCode.TreeInvalidOperation
	| ContainerErrorCode.TreeAnchorDisposed
	| ContainerErrorCode.TreeCustomTypeExists;

/**
 * DDS 操作相关错误。仅 DdsOperationFailed 可重试。
 */
export class DdsError extends ContainerError {
	constructor(
		message: string,
		errorCode: DdsErrorCode,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, errorCode, context, cause);
		this.name = "DdsError";
	}

	override get retryable(): boolean {
		return this.errorCode === ContainerErrorCode.DdsOperationFailed;
	}
}
