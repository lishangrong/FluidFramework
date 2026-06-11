import { TypedEventEmitter } from "../utils/EventEmitter.js";
import { BinarySerializer } from "../serialization/BinarySerializer.js";
import type { IDdsEvents, ISharedObject } from "../interfaces/IDds.js";

/**
 * 所有分布式数据结构的抽象基类。
 * 提供事件发射、快照序列化和操作提交的基础能力。
 */
export abstract class SharedObjectBase
	extends TypedEventEmitter<IDdsEvents>
	implements ISharedObject
{
	public readonly id: string;
	public readonly type: string;
	private _attached: boolean = false;
	private _disposed: boolean = false;
	protected readonly serializer: BinarySerializer;

	/** 操作提交回调，由 ContainerRuntime 注入。 */
	private _submitOpCallback?: (objectId: string, op: unknown) => Promise<void>;

	constructor(id: string, type: string) {
		super();
		this.id = id;
		this.type = type;
		this.serializer = new BinarySerializer();
	}

	get attached(): boolean {
		return this._attached;
	}

	get disposed(): boolean {
		return this._disposed;
	}

	/**
	 * 将此对象标记为已附加到容器。
	 */
	attach(submitOp: (objectId: string, op: unknown) => Promise<void>): void {
		this._attached = true;
		this._submitOpCallback = submitOp;
	}

	/**
	 * 获取当前状态的快照（二进制格式）。
	 * 子类必须实现此方法。
	 */
	abstract snapshot(): Uint8Array;

	/**
	 * 从快照数据恢复状态。
	 * 子类必须实现此方法。
	 */
	abstract loadFromSnapshot(data: Uint8Array): void;

	/**
	 * 应用来自远端的操作。
	 * 子类必须实现此方法。
	 */
	abstract applyOp(op: unknown): void;

	/**
	 * 提交本地操作到排序服务。
	 */
	protected async submitOp(op: unknown): Promise<void> {
		if (this._submitOpCallback) {
			await this._submitOpCallback(this.id, op);
		}
	}

	/**
	 * 处理远端操作并触发变更事件。
	 */
	processRemoteOp(op: unknown): void {
		this.applyOp(op);
		this.safeEmit("changed", {
			objectId: this.id,
			type: this.type,
		});
	}

	/**
	 * 释放资源。
	 */
	dispose(): void {
		if (this._disposed) {
			return;
		}
		this._disposed = true;
		this._attached = false;
		this._submitOpCallback = undefined;
		this.removeAllListeners();
	}
}
