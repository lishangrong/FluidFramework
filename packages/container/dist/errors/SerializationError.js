import { ContainerErrorCode } from "./ContainerErrorCode.js";
import { ContainerError } from "./ContainerError.js";
/**
 * 序列化相关错误。始终不可重试（数据格式错误）。
 */
export class SerializationError extends ContainerError {
    constructor(message, errorCode, context, cause) {
        super(message, errorCode, context, cause);
        this.name = "SerializationError";
    }
    get retryable() {
        return false;
    }
}
//# sourceMappingURL=SerializationError.js.map