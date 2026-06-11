import { ContainerErrorCode } from "./ContainerErrorCode.js";
import { ContainerError } from "./ContainerError.js";
type SerializationErrorCode = ContainerErrorCode.EncodeFailed | ContainerErrorCode.DecodeFailed | ContainerErrorCode.UnsupportedType | ContainerErrorCode.BufferOverflow | ContainerErrorCode.InvalidBinaryFormat;
/**
 * 序列化相关错误。始终不可重试（数据格式错误）。
 */
export declare class SerializationError extends ContainerError {
    constructor(message: string, errorCode: SerializationErrorCode, context?: Record<string, unknown>, cause?: Error);
    get retryable(): boolean;
}
export {};
//# sourceMappingURL=SerializationError.d.ts.map