import { ContainerErrorCode } from "./ContainerErrorCode.js";
import { ContainerError } from "./ContainerError.js";
/**
 * 快照操作相关错误。仅 SnapshotFailed 可重试。
 */
export class SnapshotError extends ContainerError {
    constructor(message, errorCode, context, cause) {
        super(message, errorCode, context, cause);
        this.name = "SnapshotError";
    }
    get retryable() {
        return this.errorCode === ContainerErrorCode.SnapshotFailed;
    }
}
//# sourceMappingURL=SnapshotError.js.map