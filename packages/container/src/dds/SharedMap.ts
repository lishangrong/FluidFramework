import { SharedObjectBase } from "./SharedObjectBase.js";
import type { ISharedMap } from "../interfaces/ISharedMap.js";

/** SharedMap 操作类型。 */
interface IMapOp {
	readonly action: "set" | "delete";
	readonly key: string;
	readonly value?: unknown;
}

/**
 * 共享键值对数据结构。
 * 支持多客户端并发读写，通过操作日志保证最终一致性。
 */
export class SharedMap extends SharedObjectBase implements ISharedMap {
	public static readonly TYPE = "SharedMap";
	private readonly data = new Map<string, unknown>();

	constructor(id: string) {
		super(id, SharedMap.TYPE);
	}

	get size(): number {
		return this.data.size;
	}

	get<T = unknown>(key: string): T | undefined {
		return this.data.get(key) as T | undefined;
	}

	set<T = unknown>(key: string, value: T): void {
		this.data.set(key, value);
		const op: IMapOp = { action: "set", key, value };
		void this.submitOp(op);
		this.safeEmit("changed", {
			objectId: this.id,
			type: this.type,
			path: key,
		});
	}

	delete(key: string): boolean {
		const existed = this.data.delete(key);
		if (existed) {
			const op: IMapOp = { action: "delete", key };
			void this.submitOp(op);
			this.safeEmit("changed", {
				objectId: this.id,
				type: this.type,
				path: key,
			});
		}
		return existed;
	}

	has(key: string): boolean {
		return this.data.has(key);
	}

	keys(): IterableIterator<string> {
		return this.data.keys();
	}

	forEach(callback: (value: unknown, key: string) => void): void {
		this.data.forEach((value, key) => callback(value, key));
	}

	/**
	 * 将当前状态序列化为二进制快照。
	 */
	snapshot(): Uint8Array {
		const obj: Record<string, unknown> = {};
		this.data.forEach((value, key) => {
			obj[key] = value;
		});
		return this.serializer.encode(obj);
	}

	/**
	 * 从二进制快照恢复状态。
	 */
	loadFromSnapshot(data: Uint8Array): void {
		const obj = this.serializer.decode(data) as Record<string, unknown>;
		this.data.clear();
		for (const [key, value] of Object.entries(obj)) {
			this.data.set(key, value);
		}
	}

	/**
	 * 应用远端操作。
	 */
	applyOp(op: unknown): void {
		const mapOp = op as IMapOp;
		switch (mapOp.action) {
			case "set":
				this.data.set(mapOp.key, mapOp.value);
				break;
			case "delete":
				this.data.delete(mapOp.key);
				break;
		}
	}
}
