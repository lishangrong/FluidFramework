import { LoaderError } from "../errors/LoaderError.js";
import { LoaderErrorCode } from "../errors/LoaderErrorCode.js";

/**
 * 断言条件为真，否则抛出 LoaderError。
 */
export function assert(
	condition: unknown,
	message: string,
	errorCode: LoaderErrorCode = LoaderErrorCode.InvalidUrl,
): asserts condition {
	if (!condition) {
		throw new LoaderError(message, errorCode);
	}
}
