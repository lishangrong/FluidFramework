import { SharedObjectBase } from "./SharedObjectBase.js";
import type { ISharedTree, ITreeNodeView, ITreeTransaction, ITreeAnchor } from "../interfaces/ISharedTree.js";
import { TreeNodeType } from "../interfaces/ISharedTree.js";
import { TreeNode } from "./tree/TreeNode.js";
import { TreeCrdt } from "./tree/TreeCrdt.js";
import { TreeTransaction } from "./tree/TreeTransaction.js";
import { TreeAnchor } from "./tree/TreeAnchor.js";
import type { ITreeOp, ISharedTreeOp } from "./tree/TreeOps.js";
import { DdsError } from "../errors/DdsError.js";
import { ContainerErrorCode } from "../errors/ContainerErrorCode.js";
import { generateUuid } from "../utils/uuid.js";

/** SharedTree 快照格式。 */
interface ITreeSnapshot {
	version: number;
	rootId: string;
	nodes: ReturnType<TreeNode["toJSON"]>[];
	customTypes: string[];
}

/**
 * 共享树数据结构。
 * 支持层次化数据的协同编辑、事务性更新和变更合并。
 */
export class SharedTree extends SharedObjectBase implements ISharedTree {
	public static readonly TYPE = "SharedTree";

	private readonly nodes = new Map<string, TreeNode>();
	private _rootId: string;
	private readonly crdt: TreeCrdt;
	private readonly anchors = new Set<TreeAnchor>();
	private readonly customTypes = new Set<string>();
	private activeTransaction: TreeTransaction | null = null;
	private currentSeq: number = 0;

	constructor(id: string) {
		super(id, SharedTree.TYPE);
		this._rootId = generateUuid();
		const root = new TreeNode(this._rootId, TreeNodeType.Object);
		this.nodes.set(this._rootId, root);
		this.crdt = new TreeCrdt(this.nodes);
	}

	get rootId(): string {
		return this._rootId;
	}

	// ---- 节点查询 ----

	getNode(nodeId: string): ITreeNodeView | undefined {
		const node = this.nodes.get(nodeId);
		if (!node) return undefined;
		return node.toView();
	}

	getNodeCount(): number {
		let count = 0;
		for (const node of this.nodes.values()) {
			if (!node.deleted) count++;
		}
		return count;
	}

	// ---- 节点创建 ----

	createObjectNode(): string {
		const nodeId = generateUuid();
		const op: ITreeOp = { action: "createNode", nodeId, nodeType: TreeNodeType.Object };
		this.crdt.applyOp(op, 0, true);
		void this.submitOp(op);
		this.emitChanged();
		return nodeId;
	}

	createArrayNode(): string {
		const nodeId = generateUuid();
		const op: ITreeOp = { action: "createNode", nodeId, nodeType: TreeNodeType.Array };
		this.crdt.applyOp(op, 0, true);
		void this.submitOp(op);
		this.emitChanged();
		return nodeId;
	}

	createLeafNode(
		type: TreeNodeType.String | TreeNodeType.Number | TreeNodeType.Boolean | TreeNodeType.Null,
		value: string | number | boolean | null,
	): string {
		const nodeId = generateUuid();
		const op: ITreeOp = { action: "createNode", nodeId, nodeType: type, value };
		this.crdt.applyOp(op, 0, true);
		void this.submitOp(op);
		this.emitChanged();
		return nodeId;
	}

	// ---- Object 节点操作 ----

	setProperty(nodeId: string, key: string, childNodeId: string): void {
		this.validateNode(nodeId, TreeNodeType.Object);
		this.validateNodeExists(childNodeId);
		const op: ITreeOp = { action: "setProperty", nodeId, key, childNodeId };
		this.crdt.applyOp(op, 0, true);
		void this.submitOp(op);
		this.emitChanged(key);
	}

	deleteProperty(nodeId: string, key: string): void {
		this.validateNode(nodeId, TreeNodeType.Object);
		const op: ITreeOp = { action: "deleteProperty", nodeId, key };
		this.crdt.applyOp(op, 0, true);
		void this.submitOp(op);
		this.emitChanged(key);
	}

	getProperty(nodeId: string, key: string): string | undefined {
		const node = this.nodes.get(nodeId);
		if (!node || node.deleted || node.type !== TreeNodeType.Object) return undefined;
		return node.properties?.get(key);
	}

	getProperties(nodeId: string): ReadonlyMap<string, string> {
		const node = this.nodes.get(nodeId);
		if (!node || node.deleted || node.type !== TreeNodeType.Object) return new Map();
		return new Map(node.properties);
	}

	// ---- Array 节点操作 ----

	insertChild(parentId: string, index: number, childNodeId: string): void {
		this.validateNode(parentId, TreeNodeType.Array);
		this.validateNodeExists(childNodeId);
		const op: ITreeOp = { action: "insertChild", parentId, index, childNodeId };
		this.crdt.applyOp(op, 0, true);
		void this.submitOp(op);
		this.emitChanged();
	}

	removeChild(parentId: string, childNodeId: string): void {
		this.validateNode(parentId, TreeNodeType.Array);
		const op: ITreeOp = { action: "removeChild", parentId, childNodeId };
		this.crdt.applyOp(op, 0, true);
		void this.submitOp(op);
		this.emitChanged();
	}

	getChild(parentId: string, index: number): string | undefined {
		const node = this.nodes.get(parentId);
		if (!node || node.deleted || node.type !== TreeNodeType.Array) return undefined;
		const children = node.getSortedChildren();
		return children[index];
	}

	getChildren(parentId: string): readonly string[] {
		const node = this.nodes.get(parentId);
		if (!node || node.deleted || node.type !== TreeNodeType.Array) return [];
		return node.getSortedChildren();
	}

	getChildCount(parentId: string): number {
		const node = this.nodes.get(parentId);
		if (!node || node.deleted || node.type !== TreeNodeType.Array) return 0;
		return node.childrenMeta?.length ?? 0;
	}

	// ---- 叶节点操作 ----

	setValue(nodeId: string, value: string | number | boolean | null): void {
		const node = this.nodes.get(nodeId);
		if (!node || node.deleted) {
			throw new DdsError("节点不存在", ContainerErrorCode.TreeNodeNotFound, { nodeId });
		}
		if (!node.isLeaf()) {
			throw new DdsError("非叶节点不能设置值", ContainerErrorCode.TreeInvalidNodeType, { nodeId });
		}
		const op: ITreeOp = { action: "setValue", nodeId, value };
		this.crdt.applyOp(op, 0, true);
		void this.submitOp(op);
		this.emitChanged();
	}

	getValue(nodeId: string): string | number | boolean | null | undefined {
		const node = this.nodes.get(nodeId);
		if (!node || node.deleted || !node.isLeaf()) return undefined;
		return node.value;
	}

	// ---- 通用操作 ----

	deleteNode(nodeId: string): void {
		if (nodeId === this._rootId) {
			throw new DdsError("不能删除根节点", ContainerErrorCode.TreeInvalidOperation, { nodeId });
		}
		this.validateNodeExists(nodeId);
		const op: ITreeOp = { action: "deleteNode", nodeId };
		this.crdt.applyOp(op, 0, true);
		void this.submitOp(op);
		this.emitChanged();
	}

	moveNode(nodeId: string, newParentId: string, key?: string, index?: number): void {
		if (nodeId === this._rootId) {
			throw new DdsError("不能移动根节点", ContainerErrorCode.TreeInvalidOperation, { nodeId });
		}
		this.validateNodeExists(nodeId);
		this.validateNodeExists(newParentId);
		if (this.crdt.detectCycle(nodeId, newParentId)) {
			throw new DdsError("检测到环路", ContainerErrorCode.TreeCycleDetected, { nodeId, newParentId });
		}
		const op: ITreeOp = { action: "moveNode", nodeId, newParentId, key, index };
		this.crdt.applyOp(op, 0, true);
		void this.submitOp(op);
		this.emitChanged();
	}

	// ---- 事务 ----

	startTransaction(): ITreeTransaction {
		if (this.activeTransaction && !this.activeTransaction.ended) {
			throw new DdsError(
				"已有活跃事务",
				ContainerErrorCode.TreeTransactionConflict,
			);
		}
		const tx = new TreeTransaction({
			applyOpLocally: (op: ITreeOp) => this.crdt.applyOp(op, 0, true),
			submitOp: (op: unknown) => this.submitOp(op),
			snapshot: () => this.snapshot(),
			loadFromSnapshot: (data: Uint8Array) => this.loadFromSnapshot(data),
		});
		this.activeTransaction = tx;
		return tx;
	}

	// ---- 锚点 ----

	createAnchor(nodeId: string): ITreeAnchor {
		this.validateNodeExists(nodeId);
		const anchor = new TreeAnchor(
			nodeId,
			(nid) => this.getNode(nid),
			(a) => this.anchors.delete(a),
		);
		this.anchors.add(anchor);
		return anchor;
	}

	// ---- 自定义类型 ----

	registerCustomType(typeName: string): void {
		if (this.customTypes.has(typeName)) {
			throw new DdsError(
				`自定义类型 "${typeName}" 已存在`,
				ContainerErrorCode.TreeCustomTypeExists,
				{ typeName },
			);
		}
		this.customTypes.add(typeName);
	}

	// ---- 抽象方法实现 ----

	snapshot(): Uint8Array {
		const snap: ITreeSnapshot = {
			version: 1,
			rootId: this._rootId,
			nodes: Array.from(this.nodes.values()).map((n) => n.toJSON()),
			customTypes: Array.from(this.customTypes),
		};
		return this.serializer.encode(snap);
	}

	loadFromSnapshot(data: Uint8Array): void {
		const snap = this.serializer.decode(data) as ITreeSnapshot;
		this.nodes.clear();
		this._rootId = snap.rootId;
		for (const nodeData of snap.nodes) {
			const node = TreeNode.fromJSON(nodeData);
			this.nodes.set(node.id, node);
		}
		this.customTypes.clear();
		if (snap.customTypes) {
			for (const t of snap.customTypes) {
				this.customTypes.add(t);
			}
		}
	}

	applyOp(op: unknown): void {
		const treeOp = op as ISharedTreeOp;
		if (treeOp.action === "batch") {
			this.crdt.applyBatch(treeOp, this.currentSeq);
		} else {
			this.crdt.applyOp(treeOp, this.currentSeq);
		}
	}

	/**
	 * 处理远端操作并触发变更事件。
	 * 重写以获取序列号。
	 */
	override processRemoteOp(op: unknown, sequenceNumber?: number): void {
		if (sequenceNumber !== undefined) {
			this.currentSeq = sequenceNumber;
		}
		this.applyOp(op);
		this.safeEmit("changed", {
			objectId: this.id,
			type: this.type,
		});
	}

	override dispose(): void {
		for (const anchor of this.anchors) {
			anchor.dispose();
		}
		this.anchors.clear();
		this.nodes.clear();
		super.dispose();
	}

	// ---- 私有辅助方法 ----

	private validateNodeExists(nodeId: string): void {
		const node = this.nodes.get(nodeId);
		if (!node || node.deleted) {
			throw new DdsError("节点不存在", ContainerErrorCode.TreeNodeNotFound, { nodeId });
		}
	}

	private validateNode(nodeId: string, expectedType: TreeNodeType): void {
		const node = this.nodes.get(nodeId);
		if (!node || node.deleted) {
			throw new DdsError("节点不存在", ContainerErrorCode.TreeNodeNotFound, { nodeId });
		}
		if (node.type !== expectedType) {
			throw new DdsError(
				`期望 ${expectedType} 类型，实际为 ${node.type}`,
				ContainerErrorCode.TreeInvalidNodeType,
				{ nodeId, expectedType, actualType: node.type },
			);
		}
	}

	private emitChanged(path?: string): void {
		this.safeEmit("changed", {
			objectId: this.id,
			type: this.type,
			path,
		});
	}
}
