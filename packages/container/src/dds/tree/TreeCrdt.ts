import { TreeNodeType } from "../../interfaces/ISharedTree.js";
import { TreeNode } from "./TreeNode.js";
import type {
	ITreeOp,
	ITreeBatchOp,
	ICreateNodeOp,
	IDeleteNodeOp,
	ISetPropertyOp,
	IDeletePropertyOp,
	IInsertChildOp,
	IRemoveChildOp,
	ISetValueOp,
	IMoveNodeOp,
} from "./TreeOps.js";

/**
 * CRDT 合并引擎。
 * 封装全部冲突解决逻辑，保证多客户端最终一致性。
 */
export class TreeCrdt {
	constructor(private readonly nodes: Map<string, TreeNode>) {}

	/**
	 * 应用单个操作。
	 * @param op 操作
	 * @param seq 序列号（本地操作传 0）
	 * @param isLocal 是否为本地操作（跳过 LWW 检查）
	 */
	applyOp(op: ITreeOp, seq: number, isLocal: boolean = false): void {
		switch (op.action) {
			case "createNode":
				this.applyCreateNode(op);
				break;
			case "deleteNode":
				this.applyDeleteNode(op, seq);
				break;
			case "setProperty":
				this.applySetProperty(op, seq, isLocal);
				break;
			case "deleteProperty":
				this.applyDeleteProperty(op, seq, isLocal);
				break;
			case "insertChild":
				this.applyInsertChild(op, seq);
				break;
			case "removeChild":
				this.applyRemoveChild(op);
				break;
			case "setValue":
				this.applySetValue(op, seq, isLocal);
				break;
			case "moveNode":
				this.applyMoveNode(op, seq, isLocal);
				break;
		}
	}

	/**
	 * 应用批量操作（事务）。
	 */
	applyBatch(batchOp: ITreeBatchOp, seq: number, isLocal: boolean = false): void {
		for (const op of batchOp.ops) {
			this.applyOp(op, seq, isLocal);
		}
	}

	/**
	 * 检测是否会形成环路。
	 */
	detectCycle(nodeId: string, newParentId: string): boolean {
		let current: string | null = newParentId;
		while (current !== null) {
			if (current === nodeId) return true;
			const parent = this.nodes.get(current);
			if (!parent || parent.deleted) break;
			current = parent.parentId;
		}
		return false;
	}

	private applyCreateNode(op: ICreateNodeOp): void {
		// 幂等：节点已存在则忽略
		if (this.nodes.has(op.nodeId)) return;
		const node = new TreeNode(op.nodeId, op.nodeType);
		if (node.isLeaf() && op.value !== undefined) {
			node.value = op.value;
		}
		this.nodes.set(op.nodeId, node);
	}

	private applyDeleteNode(op: IDeleteNodeOp, seq: number): void {
		const node = this.nodes.get(op.nodeId);
		if (!node || node.deleted) return;

		node.deleted = true;
		node.deletedSeq = seq;

		// 从父节点移除引用
		if (node.parentId) {
			const parent = this.nodes.get(node.parentId);
			if (parent) {
				if (parent.type === TreeNodeType.Object && parent.properties) {
					if (node.parentKey) {
						parent.properties.delete(node.parentKey);
						parent.propertySeqs?.delete(node.parentKey);
					}
				} else if (parent.type === TreeNodeType.Array && parent.childrenMeta) {
					parent.childrenMeta = parent.childrenMeta.filter(
						(m) => m.nodeId !== op.nodeId,
					);
				}
			}
		}

		// 递归标记所有后代为已删除
		this.deleteDescendants(node, seq);
	}

	private deleteDescendants(node: TreeNode, seq: number): void {
		if (node.type === TreeNodeType.Object && node.properties) {
			for (const childId of node.properties.values()) {
				const child = this.nodes.get(childId);
				if (child && !child.deleted) {
					child.deleted = true;
					child.deletedSeq = seq;
					this.deleteDescendants(child, seq);
				}
			}
		} else if (node.type === TreeNodeType.Array && node.childrenMeta) {
			for (const meta of node.childrenMeta) {
				const child = this.nodes.get(meta.nodeId);
				if (child && !child.deleted) {
					child.deleted = true;
					child.deletedSeq = seq;
					this.deleteDescendants(child, seq);
				}
			}
		}
	}

	private applySetProperty(op: ISetPropertyOp, seq: number, isLocal: boolean): void {
		const node = this.nodes.get(op.nodeId);
		if (!node || node.deleted) return;
		if (node.type !== TreeNodeType.Object || !node.properties || !node.propertySeqs) return;

		const child = this.nodes.get(op.childNodeId);
		if (!child || child.deleted) return;

		if (isLocal) {
			// 本地操作直接写入
			node.properties.set(op.key, op.childNodeId);
			node.propertySeqs.set(op.key, seq);
			child.parentId = op.nodeId;
			child.parentKey = op.key;
			return;
		}

		// 远端操作：LWW 按序列号
		const currentSeq = node.propertySeqs.get(op.key) ?? 0;
		if (seq > currentSeq) {
			node.properties.set(op.key, op.childNodeId);
			node.propertySeqs.set(op.key, seq);
			child.parentId = op.nodeId;
			child.parentKey = op.key;
		} else if (seq === currentSeq) {
			// 平局：按 childNodeId 字典序取较大者
			const currentChildId = node.properties.get(op.key);
			if (!currentChildId || op.childNodeId > currentChildId) {
				node.properties.set(op.key, op.childNodeId);
				node.propertySeqs.set(op.key, seq);
				child.parentId = op.nodeId;
				child.parentKey = op.key;
			}
		}
		// seq < currentSeq: 忽略过时操作
	}

	private applyDeleteProperty(op: IDeletePropertyOp, seq: number, isLocal: boolean): void {
		const node = this.nodes.get(op.nodeId);
		if (!node || node.deleted) return;
		if (node.type !== TreeNodeType.Object || !node.properties || !node.propertySeqs) return;

		if (isLocal) {
			const childId = node.properties.get(op.key);
			if (childId) {
				const child = this.nodes.get(childId);
				if (child) {
					child.parentId = null;
					child.parentKey = null;
				}
			}
			node.properties.delete(op.key);
			node.propertySeqs.set(op.key, seq);
			return;
		}

		// 远端操作：LWW
		const currentSeq = node.propertySeqs.get(op.key) ?? 0;
		if (seq > currentSeq) {
			const childId = node.properties.get(op.key);
			if (childId) {
				const child = this.nodes.get(childId);
				if (child) {
					child.parentId = null;
					child.parentKey = null;
				}
			}
			node.properties.delete(op.key);
			node.propertySeqs.set(op.key, seq);
		}
	}

	private applyInsertChild(op: IInsertChildOp, seq: number): void {
		const parent = this.nodes.get(op.parentId);
		if (!parent || parent.deleted) return;
		if (parent.type !== TreeNodeType.Array || !parent.childrenMeta) return;

		const child = this.nodes.get(op.childNodeId);
		if (!child || child.deleted) return;

		// 幂等：已存在则忽略
		if (parent.childrenMeta.some((m) => m.nodeId === op.childNodeId)) return;

		const clampedIndex = Math.max(0, Math.min(op.index, parent.childrenMeta.length));
		parent.childrenMeta.push({
			nodeId: op.childNodeId,
			insertSeq: seq,
			targetIndex: clampedIndex,
		});

		child.parentId = op.parentId;
		child.parentKey = null;
	}

	private applyRemoveChild(op: IRemoveChildOp): void {
		const parent = this.nodes.get(op.parentId);
		if (!parent || parent.deleted) return;
		if (parent.type !== TreeNodeType.Array || !parent.childrenMeta) return;

		const idx = parent.childrenMeta.findIndex((m) => m.nodeId === op.childNodeId);
		if (idx === -1) return;

		parent.childrenMeta.splice(idx, 1);

		const child = this.nodes.get(op.childNodeId);
		if (child) {
			child.parentId = null;
			child.parentKey = null;
		}
	}

	private applySetValue(op: ISetValueOp, seq: number, isLocal: boolean): void {
		const node = this.nodes.get(op.nodeId);
		if (!node || node.deleted) return;
		if (!node.isLeaf()) return;

		if (isLocal) {
			node.value = op.value;
			node.valueSeq = seq;
			return;
		}

		const currentSeq = node.valueSeq ?? 0;
		if (seq > currentSeq) {
			node.value = op.value;
			node.valueSeq = seq;
		} else if (seq === currentSeq) {
			// 平局：按序列化值比较（确定性）
			if (String(op.value) > String(node.value)) {
				node.value = op.value;
				node.valueSeq = seq;
			}
		}
	}

	private applyMoveNode(op: IMoveNodeOp, seq: number, isLocal: boolean): void {
		const node = this.nodes.get(op.nodeId);
		if (!node || node.deleted) return;

		// 检查序列号（非本地操作时）
		if (!isLocal && seq <= node.moveSeq) return;

		// 环路检测
		if (this.detectCycle(op.nodeId, op.newParentId)) return;

		const newParent = this.nodes.get(op.newParentId);
		if (!newParent || newParent.deleted) return;

		// 从旧父节点移除
		if (node.parentId) {
			const oldParent = this.nodes.get(node.parentId);
			if (oldParent) {
				if (oldParent.type === TreeNodeType.Object && oldParent.properties) {
					if (node.parentKey) {
						oldParent.properties.delete(node.parentKey);
						oldParent.propertySeqs?.delete(node.parentKey);
					}
				} else if (oldParent.type === TreeNodeType.Array && oldParent.childrenMeta) {
					oldParent.childrenMeta = oldParent.childrenMeta.filter(
						(m) => m.nodeId !== op.nodeId,
					);
				}
			}
		}

		// 添加到新父节点
		if (newParent.type === TreeNodeType.Object && newParent.properties) {
			const key = op.key ?? node.id;
			newParent.properties.set(key, node.id);
			newParent.propertySeqs?.set(key, seq);
			node.parentKey = key;
		} else if (newParent.type === TreeNodeType.Array && newParent.childrenMeta) {
			const index = op.index ?? newParent.childrenMeta.length;
			const clampedIndex = Math.max(0, Math.min(index, newParent.childrenMeta.length));
			newParent.childrenMeta.push({
				nodeId: node.id,
				insertSeq: seq,
				targetIndex: clampedIndex,
			});
			node.parentKey = null;
		}

		node.parentId = op.newParentId;
		node.moveSeq = seq;
	}
}
