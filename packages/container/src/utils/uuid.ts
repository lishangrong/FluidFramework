import { randomUUID } from "node:crypto";

/**
 * 生成唯一标识符（UUID v4）。
 */
export function generateUuid(): string {
	return randomUUID();
}
