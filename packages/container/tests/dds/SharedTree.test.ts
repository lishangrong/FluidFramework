import { describe, it, expect, vi } from "vitest";
import { SharedTree } from "../../src/dds/SharedTree.js";
import { TreeNodeType } from "../../src/interfaces/ISharedTree.js";

describe("SharedTree", () => {
	describe("基础功能", () => {
		it("类型标识应为 SharedTree", () => {
			const tree = new SharedTree("tree1");
			expect(tree.type).toBe("SharedTree");
		});

		it("构造后应有一个 Object 类型的根节点", () => {
			const tree = new SharedTree("tree1");
			const root = tree.getNode(tree.rootId);
			expect(root).toBeDefined();
			expect(root!.type).toBe(TreeNodeType.Object);
			expect(root!.deleted).toBe(false);
		});

		it("应正确创建 Object 节点", () => {
			const tree = new SharedTree("tree1");
			const nodeId = tree.createObjectNode();
			const node = tree.getNode(nodeId);
			expect(node).toBeDefined();
			expect(node!.type).toBe(TreeNodeType.Object);
		});

		it("应正确创建 Array 节点", () => {
			const tree = new SharedTree("tree1");
			const nodeId = tree.createArrayNode();
			const node = tree.getNode(nodeId);
			expect(node).toBeDefined();
			expect(node!.type).toBe(TreeNodeType.Array);
		});

		it("应正确创建各类型叶节点", () => {
			const tree = new SharedTree("tree1");

			const strId = tree.createLeafNode(TreeNodeType.String, "hello");
			expect(tree.getValue(strId)).toBe("hello");

			const numId = tree.createLeafNode(TreeNodeType.Number, 42);
			expect(tree.getValue(numId)).toBe(42);

			const boolId = tree.createLeafNode(TreeNodeType.Boolean, true);
			expect(tree.getValue(boolId)).toBe(true);

			const nullId = tree.createLeafNode(TreeNodeType.Null, null);
			expect(tree.getValue(nullId)).toBe(null);
		});

		it("getNodeCount 应返回非 tombstone 节点数量", () => {
			const tree = new SharedTree("tree1");
			expect(tree.getNodeCount()).toBe(1); // 只有根节点
			const n1 = tree.createObjectNode();
			expect(tree.getNodeCount()).toBe(2);
			tree.deleteNode(n1);
			expect(tree.getNodeCount()).toBe(1);
		});
	});

	describe("Object 节点操作", () => {
		it("应正确设置和获取属性", () => {
			const tree = new SharedTree("tree1");
			const childId = tree.createLeafNode(TreeNodeType.String, "value1");
			tree.setProperty(tree.rootId, "name", childId);
			expect(tree.getProperty(tree.rootId, "name")).toBe(childId);
		});

		it("应正确删除属性", () => {
			const tree = new SharedTree("tree1");
			const childId = tree.createLeafNode(TreeNodeType.String, "value1");
			tree.setProperty(tree.rootId, "name", childId);
			tree.deleteProperty(tree.rootId, "name");
			expect(tree.getProperty(tree.rootId, "name")).toBeUndefined();
		});

		it("getProperties 应返回所有属性", () => {
			const tree = new SharedTree("tree1");
			const c1 = tree.createLeafNode(TreeNodeType.String, "a");
			const c2 = tree.createLeafNode(TreeNodeType.Number, 1);
			tree.setProperty(tree.rootId, "x", c1);
			tree.setProperty(tree.rootId, "y", c2);
			const props = tree.getProperties(tree.rootId);
			expect(props.size).toBe(2);
			expect(props.get("x")).toBe(c1);
			expect(props.get("y")).toBe(c2);
		});

		it("对非 Object 节点调用 setProperty 应抛出 TreeInvalidNodeType", () => {
			const tree = new SharedTree("tree1");
			const arrId = tree.createArrayNode();
			tree.setProperty(tree.rootId, "arr", arrId);
			const leafId = tree.createLeafNode(TreeNodeType.String, "x");
			expect(() => tree.setProperty(arrId, "key", leafId)).toThrow("期望 object 类型");
		});

		it("对不存在的节点操作应抛出 TreeNodeNotFound", () => {
			const tree = new SharedTree("tree1");
			const leafId = tree.createLeafNode(TreeNodeType.String, "x");
			expect(() => tree.setProperty("nonexistent", "key", leafId)).toThrow("节点不存在");
		});
	});

	describe("Array 节点操作", () => {
		it("应正确插入子节点", () => {
			const tree = new SharedTree("tree1");
			const arrId = tree.createArrayNode();
			const c1 = tree.createLeafNode(TreeNodeType.String, "a");
			const c2 = tree.createLeafNode(TreeNodeType.String, "b");
			tree.insertChild(arrId, 0, c1);
			tree.insertChild(arrId, 1, c2);
			expect(tree.getChildren(arrId)).toEqual([c1, c2]);
		});

		it("应正确移除子节点", () => {
			const tree = new SharedTree("tree1");
			const arrId = tree.createArrayNode();
			const c1 = tree.createLeafNode(TreeNodeType.String, "a");
			tree.insertChild(arrId, 0, c1);
			tree.removeChild(arrId, c1);
			expect(tree.getChildren(arrId)).toEqual([]);
		});

		it("应返回正确的子节点数量", () => {
			const tree = new SharedTree("tree1");
			const arrId = tree.createArrayNode();
			expect(tree.getChildCount(arrId)).toBe(0);
			const c1 = tree.createLeafNode(TreeNodeType.String, "a");
			tree.insertChild(arrId, 0, c1);
			expect(tree.getChildCount(arrId)).toBe(1);
		});

		it("getChild 应返回指定位置的子节点", () => {
			const tree = new SharedTree("tree1");
			const arrId = tree.createArrayNode();
			const c1 = tree.createLeafNode(TreeNodeType.String, "a");
			const c2 = tree.createLeafNode(TreeNodeType.String, "b");
			tree.insertChild(arrId, 0, c1);
			tree.insertChild(arrId, 1, c2);
			expect(tree.getChild(arrId, 0)).toBe(c1);
			expect(tree.getChild(arrId, 1)).toBe(c2);
			expect(tree.getChild(arrId, 2)).toBeUndefined();
		});
	});

	describe("叶节点操作", () => {
		it("应正确设置和获取叶节点值", () => {
			const tree = new SharedTree("tree1");
			const nodeId = tree.createLeafNode(TreeNodeType.String, "old");
			tree.setValue(nodeId, "new");
			expect(tree.getValue(nodeId)).toBe("new");
		});

		it("对非叶节点调用 setValue 应抛出 TreeInvalidNodeType", () => {
			const tree = new SharedTree("tree1");
			expect(() => tree.setValue(tree.rootId, "val")).toThrow("非叶节点");
		});
	});

	describe("删除操作", () => {
		it("应正确标记节点为已删除", () => {
			const tree = new SharedTree("tree1");
			const nodeId = tree.createObjectNode();
			tree.deleteNode(nodeId);
			const node = tree.getNode(nodeId);
			expect(node!.deleted).toBe(true);
		});

		it("不能删除根节点", () => {
			const tree = new SharedTree("tree1");
			expect(() => tree.deleteNode(tree.rootId)).toThrow("不能删除根节点");
		});

		it("删除不存在的节点应抛出 TreeNodeNotFound", () => {
			const tree = new SharedTree("tree1");
			expect(() => tree.deleteNode("nonexistent")).toThrow("节点不存在");
		});
	});

	describe("移动操作", () => {
		it("应正确将节点移动到新父节点", () => {
			const tree = new SharedTree("tree1");
			const objA = tree.createObjectNode();
			const objB = tree.createObjectNode();
			const child = tree.createLeafNode(TreeNodeType.String, "val");
			tree.setProperty(tree.rootId, "a", objA);
			tree.setProperty(tree.rootId, "b", objB);
			tree.setProperty(objA, "child", child);

			tree.moveNode(child, objB, "child");
			expect(tree.getProperty(objB, "child")).toBe(child);
		});

		it("移动操作检测到环路时应抛出 TreeCycleDetected", () => {
			const tree = new SharedTree("tree1");
			const a = tree.createObjectNode();
			const b = tree.createObjectNode();
			tree.setProperty(tree.rootId, "a", a);
			tree.setProperty(a, "b", b);

			expect(() => tree.moveNode(a, b, "parent")).toThrow("检测到环路");
		});

		it("不能移动根节点", () => {
			const tree = new SharedTree("tree1");
			const target = tree.createObjectNode();
			tree.setProperty(tree.rootId, "t", target);
			expect(() => tree.moveNode(tree.rootId, target, "root")).toThrow("不能移动根节点");
		});
	});

	describe("快照与恢复", () => {
		it("快照和恢复应保持整棵树数据一致", () => {
			const tree1 = new SharedTree("tree1");
			const c1 = tree1.createLeafNode(TreeNodeType.String, "hello");
			const c2 = tree1.createLeafNode(TreeNodeType.Number, 42);
			const arr = tree1.createArrayNode();
			tree1.setProperty(tree1.rootId, "name", c1);
			tree1.setProperty(tree1.rootId, "arr", arr);
			tree1.insertChild(arr, 0, c2);

			const snap = tree1.snapshot();
			const tree2 = new SharedTree("tree2");
			tree2.loadFromSnapshot(snap);

			expect(tree2.rootId).toBe(tree1.rootId);
			expect(tree2.getValue(c1)).toBe("hello");
			expect(tree2.getValue(c2)).toBe(42);
			expect(tree2.getChildren(arr)).toEqual([c2]);
		});

		it("快照应包含 tombstone 节点", () => {
			const tree1 = new SharedTree("tree1");
			const n = tree1.createObjectNode();
			tree1.deleteNode(n);

			const snap = tree1.snapshot();
			const tree2 = new SharedTree("tree2");
			tree2.loadFromSnapshot(snap);

			const node = tree2.getNode(n);
			expect(node).toBeDefined();
			expect(node!.deleted).toBe(true);
		});
	});

	describe("远端操作", () => {
		it("应正确应用远端 createNode 操作", () => {
			const tree = new SharedTree("tree1");
			tree.processRemoteOp(
				{ action: "createNode", nodeId: "remote-1", nodeType: TreeNodeType.String, value: "remote" },
				10,
			);
			expect(tree.getNode("remote-1")).toBeDefined();
			expect(tree.getValue("remote-1")).toBe("remote");
		});

		it("应正确应用远端 setProperty 操作", () => {
			const tree = new SharedTree("tree1");
			tree.processRemoteOp(
				{ action: "createNode", nodeId: "v1", nodeType: TreeNodeType.String, value: "val" },
				10,
			);
			tree.processRemoteOp(
				{ action: "setProperty", nodeId: tree.rootId, key: "k", childNodeId: "v1" },
				11,
			);
			expect(tree.getProperty(tree.rootId, "k")).toBe("v1");
		});

		it("应正确应用远端 deleteNode 操作", () => {
			const tree = new SharedTree("tree1");
			tree.processRemoteOp(
				{ action: "createNode", nodeId: "n1", nodeType: TreeNodeType.Object },
				10,
			);
			tree.processRemoteOp({ action: "deleteNode", nodeId: "n1" }, 11);
			expect(tree.getNode("n1")!.deleted).toBe(true);
		});

		it("应正确应用远端 batch 操作", () => {
			const tree = new SharedTree("tree1");
			tree.processRemoteOp({
				action: "batch",
				transactionId: "tx1",
				ops: [
					{ action: "createNode", nodeId: "b1", nodeType: TreeNodeType.String, value: "a" },
					{ action: "createNode", nodeId: "b2", nodeType: TreeNodeType.Number, value: 1 },
					{ action: "setProperty", nodeId: tree.rootId, key: "x", childNodeId: "b1" },
				],
			}, 20);
			expect(tree.getProperty(tree.rootId, "x")).toBe("b1");
			expect(tree.getValue("b2")).toBe(1);
		});
	});

	describe("事务", () => {
		it("事务 commit 应将操作打包提交", () => {
			const tree = new SharedTree("tree1");
			const tx = tree.startTransaction();
			const n = tx.createNode(TreeNodeType.String, "hello");
			tx.setProperty(tree.rootId, "val", n);
			tx.commit();
			expect(tree.getProperty(tree.rootId, "val")).toBe(n);
		});

		it("事务 rollback 应恢复到事务前状态", () => {
			const tree = new SharedTree("tree1");
			const before = tree.getNodeCount();
			const tx = tree.startTransaction();
			tx.createNode(TreeNodeType.String, "temp");
			tx.rollback();
			expect(tree.getNodeCount()).toBe(before);
		});

		it("不能同时开启两个事务", () => {
			const tree = new SharedTree("tree1");
			tree.startTransaction();
			expect(() => tree.startTransaction()).toThrow("已有活跃事务");
		});

		it("事务结束后应允许开启新事务", () => {
			const tree = new SharedTree("tree1");
			const tx1 = tree.startTransaction();
			tx1.commit();
			const tx2 = tree.startTransaction();
			expect(tx2.ended).toBe(false);
			tx2.commit();
		});
	});

	describe("锚点", () => {
		it("应正确创建锚点并 resolve 到目标节点", () => {
			const tree = new SharedTree("tree1");
			const nodeId = tree.createLeafNode(TreeNodeType.String, "test");
			const anchor = tree.createAnchor(nodeId);
			const view = anchor.resolve();
			expect(view).toBeDefined();
			expect(view!.id).toBe(nodeId);
		});

		it("目标节点被删除后 resolve 应返回 undefined", () => {
			const tree = new SharedTree("tree1");
			const nodeId = tree.createLeafNode(TreeNodeType.String, "test");
			const anchor = tree.createAnchor(nodeId);
			tree.deleteNode(nodeId);
			expect(anchor.resolve()).toBeUndefined();
		});

		it("对不存在的节点创建锚点应抛出 TreeNodeNotFound", () => {
			const tree = new SharedTree("tree1");
			expect(() => tree.createAnchor("nonexistent")).toThrow("节点不存在");
		});
	});

	describe("自定义类型", () => {
		it("应允许注册自定义类型", () => {
			const tree = new SharedTree("tree1");
			tree.registerCustomType("MyWidget");
			// 不抛出异常即为成功
		});

		it("注册已有自定义类型应抛出 TreeCustomTypeExists", () => {
			const tree = new SharedTree("tree1");
			tree.registerCustomType("MyWidget");
			expect(() => tree.registerCustomType("MyWidget")).toThrow("已存在");
		});
	});

	describe("事件与生命周期", () => {
		it("操作时应触发 changed 事件", () => {
			const tree = new SharedTree("tree1");
			const listener = vi.fn();
			tree.on("changed", listener);
			tree.createObjectNode();
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({ objectId: "tree1", type: "SharedTree" }),
			);
		});

		it("dispose 后应标记为已销毁", () => {
			const tree = new SharedTree("tree1");
			tree.dispose();
			expect(tree.disposed).toBe(true);
		});
	});
});
