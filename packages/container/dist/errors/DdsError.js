import { ContainerErrorCode } from "./ContainerErrorCode.js";
import { ContainerError } from "./ContainerError.js";
/**
 * DDS 操作相关错误。仅 DdsOperationFailed 可重试。
 */
export class DdsError extends ContainerError {
    constructor(message, errorCode, context, cause) {
        super(message, errorCode, context, cause);
        this.name = "DdsError";
    }
    get retryable() {
        return this.errorCode === ContainerErrorCode.DdsOperationFailed;
    }
}
//# sourceMappingURL=DdsError.js.map