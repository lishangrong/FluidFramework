import { ContainerErrorCode } from "./ContainerErrorCode.js";
import { ContainerError } from "./ContainerError.js";
type SnapshotErrorCode = ContainerErrorCode.SnapshotFailed | ContainerErrorCode.SnapshotRestoreFailed | ContainerErrorCode.SnapshotCorrupted;
/**
 * 快照操作相关错误。仅 SnapshotFailed 可重试。
 */
export declare class SnapshotError extends ContainerError {
    constructor(message: string, errorCode: SnapshotErrorCode, context?: Record<string, unknown>, cause?: Error);
    get retryable(): boolean;
}
export {};
//# sourceMappingURL=SnapshotError.d.ts.map