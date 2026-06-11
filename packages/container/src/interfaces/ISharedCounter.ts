import type { ISharedObject } from "./IDds.js";

/**
 * 共享原子计数器数据结构接口。
 */
export interface ISharedCounter extends ISharedObject {
	/** 获取当前值。 */
	getValue(): number;
	/** 递增计数器。 */
	increment(amount?: number): void;
	/** 递减计数器。 */
	decrement(amount?: number): void;
}
