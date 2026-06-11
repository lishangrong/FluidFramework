import { TreeNodeType } from "../../interfaces/ISharedTree.js";
import type { ITreeNodeView } from "../../interfaces/ISharedTree.js";

/** Array 节点子元素的元数据，用于 CRDT 排序。 */
export interface ArrayChildMeta {
	readonly nodeId: string;
	insertSeq: number;
	targetIndex: number;
}

/** 树节点快照格式。 */
export interface ITreeNodeSnapshot {
	id: string;
	type: string;
	parentId: string | null;
	parentKey: string | null;
	deleted: boolean;
	deletedSeq: number;
	moveSeq: number;
	properties?: [string, string][];
	propertySeqs?: [string, number][];
	childrenMeta?: ArrayChildMeta[];
	value?: string | number | boolean | null;
	valueSeq?: number;
}

const LEAF_TYPES: ReadonlySet<string> = new Set([
	TreeNodeType.String,
	TreeNodeType.Number,
	TreeNodeType.Boolean,
	TreeNodeType.Null,
]);

/**
 * 树节点内部数据结构。
 */
export class TreeNode {
	public parentId: string | null = null;
	public parentKey: string | null = null;
	public deleted: boolean = false;
	public deletedSeq: number = 0;
	public moveSeq: number = 0;

	/** Object 节点：属性映射 key -> childNodeId。 */
	public properties?: Map<string, string>;
	/** Object 节点：属性序列号 key -> seq（LWW）。 */
	public propertySeqs?: Map<string, number>;

	/** Array 节点：有序子元素元数据。 */
	public childrenMeta?: ArrayChildMeta[];

	/** 叶节点值。 */
	public value?: string | number | boolean | null;
	/** 叶节点值的序列号（LWW）。 */
	public valueSeq?: number;

	constructor(
		public readonly id: string,
		public readonly type: TreeNodeType | string,
	) {
		if (type === TreeNodeType.Object) {
			this.properties = new Map();
			this.propertySeqs = new Map();
		} else if (type === TreeNodeType.Array) {
			this.childrenMeta = [];
		}
	}

	/** 是否为叶节点类型。 */
	isLeaf(): boolean {
		return LEAF_TYPES.has(this.type);
	}

	/** 获取 Array 节点排序后的子节点 ID 列表。 */
	getSortedChildren(): string[] {
		if (!this.childrenMeta) return [];
		const sorted = [...this.childrenMeta].sort((a, b) => {
			if (a.targetIndex !== b.targetIndex) return a.targetIndex - b.targetIndex;
			if (a.insertSeq !== b.insertSeq) return a.insertSeq - b.insertSeq;
			return a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0;
		});
		return sorted.map((m) => m.nodeId);
	}

	/** 转换为只读视图。 */
	toView(): ITreeNodeView {
		const view: ITreeNodeView = {
			id: this.id,
			type: this.type,
			parentId: this.parentId,
			parentKey: this.parentKey,
			deleted: this.deleted,
		};

		if (this.type === TreeNodeType.Object && this.properties) {
			(view as { properties: ReadonlyMap<string, string> }).properties =
				new Map(this.properties);
		} else if (this.type === TreeNodeType.Array) {
			(view as { children: readonly string[] }).children =
				this.getSortedChildren();
		} else if (this.isLeaf()) {
			(view as { value: string | number | boolean | null | undefined }).value =
				this.value;
		}

		return view;
	}

	/** 序列化为 JSON 安全对象。 */
	toJSON(): ITreeNodeSnapshot {
		const snap: ITreeNodeSnapshot = {
			id: this.id,
			type: this.type,
			parentId: this.parentId,
			parentKey: this.parentKey,
			deleted: this.deleted,
			deletedSeq: this.deletedSeq,
			moveSeq: this.moveSeq,
		};

		if (this.properties) {
			(snap as { properties: [string, string][] }).properties = [...this.properties.entries()];
		}
		if (this.propertySeqs) {
			(snap as { propertySeqs: [string, number][] }).propertySeqs = [...this.propertySeqs.entries()];
		}
		if (this.childrenMeta) {
			(snap as { childrenMeta: ArrayChildMeta[] }).childrenMeta = [...this.childrenMeta];
		}
		if (this.value !== undefined) {
			snap.value = this.value;
		}
		if (this.valueSeq !== undefined) {
			snap.valueSeq = this.valueSeq;
		}

		return snap;
	}

	/** 从 JSON 快照反序列化。 */
	static fromJSON(data: ITreeNodeSnapshot): TreeNode {
		const node = new TreeNode(data.id, data.type as TreeNodeType | string);
		node.parentId = data.parentId;
		node.parentKey = data.parentKey;
		node.deleted = data.deleted;
		node.deletedSeq = data.deletedSeq;
		node.moveSeq = data.moveSeq;

		if (data.properties) {
			node.properties = new Map(data.properties);
		}
		if (data.propertySeqs) {
			node.propertySeqs = new Map(data.propertySeqs);
		}
		if (data.childrenMeta) {
			node.childrenMeta = [...data.childrenMeta];
		}
		if (data.value !== undefined) {
			node.value = data.value;
		}
		if (data.valueSeq !== undefined) {
			node.valueSeq = data.valueSeq;
		}

		return node;
	}
}
