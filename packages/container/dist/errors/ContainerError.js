import { ContainerErrorCode } from "./ContainerErrorCode.js";
/**
 * 所有 Container 错误的基类。
 * 提供错误码、时间戳、上下文信息和可重试性判断。
 */
export class ContainerError extends Error {
    errorCode;
    timestamp;
    context;
    constructor(message, errorCode, context, cause) {
        super(message, { cause });
        this.name = "ContainerError";
        this.errorCode = errorCode;
        this.timestamp = Date.now();
        this.context = context;
    }
    /**
     * 此错误是否可重试。子类可覆盖此属性。
     */
    get retryable() {
        return false;
    }
}
//# sourceMappingURL=ContainerError.js.map