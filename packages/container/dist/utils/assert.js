import { ContainerError } from "../errors/ContainerError.js";
import { ContainerErrorCode } from "../errors/ContainerErrorCode.js";
/**
 * 断言条件为真，否则抛出 ContainerError。
 */
export function assert(condition, message, errorCode = ContainerErrorCode.InvalidOperation) {
    if (!condition) {
        throw new ContainerError(message, errorCode);
    }
}
//# sourceMappingURL=assert.js.map