import { ContainerErrorCode } from "./ContainerErrorCode.js";
import { ContainerError } from "./ContainerError.js";

type SnapshotErrorCode =
	| ContainerErrorCode.SnapshotFailed
	| ContainerErrorCode.SnapshotRestoreFailed
	| ContainerErrorCode.SnapshotCorrupted;

/**
 * 快照操作相关错误。仅 SnapshotFailed 可重试。
 */
export class SnapshotError extends ContainerError {
	constructor(
		message: string,
		errorCode: SnapshotErrorCode,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super(message, errorCode, context, cause);
		this.name = "SnapshotError";
	}

	override get retryable(): boolean {
		return this.errorCode === ContainerErrorCode.SnapshotFailed;
	}
}
