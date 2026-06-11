import { ContainerErrorCode } from "./ContainerErrorCode.js";
import { ContainerError } from "./ContainerError.js";
type DdsErrorCode = ContainerErrorCode.DdsNotFound | ContainerErrorCode.DdsAlreadyExists | ContainerErrorCode.DdsOperationFailed | ContainerErrorCode.DdsDisposed | ContainerErrorCode.InvalidOperation;
/**
 * DDS 操作相关错误。仅 DdsOperationFailed 可重试。
 */
export declare class DdsError extends ContainerError {
    constructor(message: string, errorCode: DdsErrorCode, context?: Record<string, unknown>, cause?: Error);
    get retryable(): boolean;
}
export {};
//# sourceMappingURL=DdsError.d.ts.map