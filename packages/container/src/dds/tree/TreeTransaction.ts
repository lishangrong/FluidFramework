import { TreeNodeType } from "../../interfaces/ISharedTree.js";
import { DdsError } from "../../errors/DdsError.js";
import { ContainerErrorCode } from "../../errors/ContainerErrorCode.js";
import { generateUuid } from "../../utils/uuid.js";
import type { ITreeOp, ITreeBatchOp } from "./TreeOps.js";

/** SharedTree 内部操作接口，由 TreeTransaction 调用。 */
export interface ITreeHost {
	applyOpLocally(op: ITreeOp): void;
	submitOp(op: unknown): Promise<void>;
	snapshot(): Uint8Array;
	loadFromSnapshot(data: Uint8Array): void;
}

/**
 * 树事务。
 * 收集多个操作，commit 时打包为原子操作提交。
 */
export class TreeTransaction {
	private readonly ops: ITreeOp[] = [];
	private _ended: boolean = false;
	private readonly stateSnapshot: Uint8Array;
	private readonly transactionId: string;

	constructor(private readonly host: ITreeHost) {
		this.stateSnapshot = host.snapshot();
		this.transactionId = generateUuid();
	}

	get ended(): boolean {
		return this._ended;
	}

	/**
	 * 创建节点。
	 */
	createNode(type: TreeNodeType | string, value?: string | number | boolean | null): string {
		this.ensureActive();
		const nodeId = generateUuid();
		const op: ITreeOp = { action: "createNode", nodeId, nodeType: type, value };
		this.ops.push(op);
		this.host.applyOpLocally(op);
		return nodeId;
	}

	/**
	 * 删除节点。
	 */
	deleteNode(nodeId: string): void {
		this.ensureActive();
		const op: ITreeOp = { action: "deleteNode", nodeId };
		this.ops.push(op);
		this.host.applyOpLocally(op);
	}

	/**
	 * 设置 Object 节点属性。
	 */
	setProperty(nodeId: string, key: string, childNodeId: string): void {
		this.ensureActive();
		const op: ITreeOp = { action: "setProperty", nodeId, key, childNodeId };
		this.ops.push(op);
		this.host.applyOpLocally(op);
	}

	/**
	 * 删除 Object 节点属性。
	 */
	deleteProperty(nodeId: string, key: string): void {
		this.ensureActive();
		const op: ITreeOp = { action: "deleteProperty", nodeId, key };
		this.ops.push(op);
		this.host.applyOpLocally(op);
	}

	/**
	 * 在 Array 节点指定位置插入子节点。
	 */
	insertChild(parentId: string, index: number, childNodeId: string): void {
		this.ensureActive();
		const op: ITreeOp = { action: "insertChild", parentId, index, childNodeId };
		this.ops.push(op);
		this.host.applyOpLocally(op);
	}

	/**
	 * 从 Array 节点移除子节点。
	 */
	removeChild(parentId: string, childNodeId: string): void {
		this.ensureActive();
		const op: ITreeOp = { action: "removeChild", parentId, childNodeId };
		this.ops.push(op);
		this.host.applyOpLocally(op);
	}

	/**
	 * 设置叶节点值。
	 */
	setValue(nodeId: string, value: string | number | boolean | null): void {
		this.ensureActive();
		const op: ITreeOp = { action: "setValue", nodeId, value };
		this.ops.push(op);
		this.host.applyOpLocally(op);
	}

	/**
	 * 移动节点到新父节点。
	 */
	moveNode(nodeId: string, newParentId: string, key?: string, index?: number): void {
		this.ensureActive();
		const op: ITreeOp = { action: "moveNode", nodeId, newParentId, key, index };
		this.ops.push(op);
		this.host.applyOpLocally(op);
	}

	/**
	 * 提交事务。
	 */
	commit(): void {
		this.ensureActive();
		this._ended = true;
		if (this.ops.length === 0) return;
		const batchOp: ITreeBatchOp = {
			action: "batch",
			ops: [...this.ops],
			transactionId: this.transactionId,
		};
		void this.host.submitOp(batchOp);
	}

	/**
	 * 回滚事务。
	 */
	rollback(): void {
		this.ensureActive();
		this._ended = true;
		this.host.loadFromSnapshot(this.stateSnapshot);
	}

	private ensureActive(): void {
		if (this._ended) {
			throw new DdsError(
				"事务已结束",
				ContainerErrorCode.TreeTransactionEnded,
			);
		}
	}
}
