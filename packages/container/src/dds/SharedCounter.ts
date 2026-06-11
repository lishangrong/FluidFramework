import { SharedObjectBase } from "./SharedObjectBase.js";
import type { ISharedCounter } from "../interfaces/ISharedCounter.js";

/** SharedCounter 操作类型。 */
interface ICounterOp {
	readonly action: "increment";
	readonly amount: number;
}

/**
 * 共享原子计数器数据结构。
 * 使用增量操作（而非绝对值设置）确保并发递增的正确合并。
 */
export class SharedCounter extends SharedObjectBase implements ISharedCounter {
	public static readonly TYPE = "SharedCounter";
	private value: number = 0;

	constructor(id: string) {
		super(id, SharedCounter.TYPE);
	}

	getValue(): number {
		return this.value;
	}

	increment(amount: number = 1): void {
		this.value += amount;
		const op: ICounterOp = { action: "increment", amount };
		void this.submitOp(op);
		this.safeEmit("changed", {
			objectId: this.id,
			type: this.type,
		});
	}

	decrement(amount: number = 1): void {
		this.increment(-amount);
	}

	/**
	 * 将当前计数值序列化为二进制快照。
	 */
	snapshot(): Uint8Array {
		return this.serializer.encode(this.value);
	}

	/**
	 * 从二进制快照恢复计数值。
	 */
	loadFromSnapshot(data: Uint8Array): void {
		this.value = this.serializer.decode(data) as number;
	}

	/**
	 * 应用远端操作。
	 */
	applyOp(op: unknown): void {
		const counterOp = op as ICounterOp;
		if (counterOp.action === "increment") {
			this.value += counterOp.amount;
		}
	}
}
