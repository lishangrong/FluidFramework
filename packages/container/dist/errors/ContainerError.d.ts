import { ContainerErrorCode } from "./ContainerErrorCode.js";
/**
 * 所有 Container 错误的基类。
 * 提供错误码、时间戳、上下文信息和可重试性判断。
 */
export declare class ContainerError extends Error {
    readonly errorCode: ContainerErrorCode;
    readonly timestamp: number;
    readonly context?: Record<string, unknown>;
    constructor(message: string, errorCode: ContainerErrorCode, context?: Record<string, unknown>, cause?: Error);
    /**
     * 此错误是否可重试。子类可覆盖此属性。
     */
    get retryable(): boolean;
}
//# sourceMappingURL=ContainerError.d.ts.map