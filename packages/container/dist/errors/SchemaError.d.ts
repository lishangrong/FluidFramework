import { ContainerErrorCode } from "./ContainerErrorCode.js";
import { ContainerError } from "./ContainerError.js";
type SchemaErrorCode = ContainerErrorCode.InvalidSchema | ContainerErrorCode.UnknownDdsType | ContainerErrorCode.DuplicateInitialObject | ContainerErrorCode.DynamicTypeNotRegistered;
/**
 * Schema 相关错误。始终不可重试（配置类错误）。
 */
export declare class SchemaError extends ContainerError {
    constructor(message: string, errorCode: SchemaErrorCode, context?: Record<string, unknown>, cause?: Error);
    get retryable(): boolean;
}
export {};
//# sourceMappingURL=SchemaError.d.ts.map