import { describe, it, expect } from "vitest";
import { TreeCrdt } from "../../../src/dds/tree/TreeCrdt.js";
import { TreeNode } from "../../../src/dds/tree/TreeNode.js";
import { TreeNodeType } from "../../../src/interfaces/ISharedTree.js";

function createNodes(): Map<string, TreeNode> {
	const nodes = new Map<string, TreeNode>();
	const root = new TreeNode("root", TreeNodeType.Object);
	nodes.set("root", root);
	return nodes;
}

describe("TreeCrdt", () => {
	describe("基础操作", () => {
		it("应正确创建节点", () => {
			const nodes = createNodes();
			const crdt = new TreeCrdt(nodes);
			crdt.applyOp({ action: "createNode", nodeId: "n1", nodeType: TreeNodeType.String, value: "hello" }, 1);
			expect(nodes.has("n1")).toBe(true);
			expect(nodes.get("n1")!.value).toBe("hello");
		});

		it("重复创建同一节点应幂等", () => {
			const nodes = createNodes();
			const crdt = new TreeCrdt(nodes);
			crdt.applyOp({ action: "createNode", nodeId: "n1", nodeType: TreeNodeType.String, value: "hello" }, 1);
			crdt.applyOp({ action: "createNode", nodeId: "n1", nodeType: TreeNodeType.Number, value: 42 }, 2);
			expect(nodes.get("n1")!.type).toBe(TreeNodeType.String);
			expect(nodes.get("n1")!.value).toBe("hello");
		});

		it("应正确删除节点", () => {
			const nodes = createNodes();
			const crdt = new TreeCrdt(nodes);
			crdt.applyOp({ action: "createNode", nodeId: "n1", nodeType: TreeNodeType.String, value: "hello" }, 1);
			crdt.applyOp({ action: "deleteNode", nodeId: "n1" }, 2);
			expect(nodes.get("n1")!.deleted).toBe(true);
		});

		it("重复删除同一节点应幂等", () => {
			const nodes = createNodes();
			const crdt = new TreeCrdt(nodes);
			crdt.applyOp({ action: "createNode", nodeId: "n1", nodeType: TreeNodeType.String }, 1);
			crdt.applyOp({ action: "deleteNode", nodeId: "n1" }, 2);
			crdt.applyOp({ action: "deleteNode", nodeId: "n1" }, 3);
			expect(nodes.get("n1")!.deleted).toBe(true);
		});
	});

	describe("并发插入（Array 节点）", () => {
		it("同一位置并发插入应按节点 ID 字典序排列", () => {
			const nodes = new Map<string, TreeNode>();
			const arr = new TreeNode("arr", TreeNodeType.Array);
			nodes.set("arr", arr);
			const crdt = new TreeCrdt(nodes);

			// 创建两个子节点
			crdt.applyOp({ action: "createNode", nodeId: "b-node", nodeType: TreeNodeType.String, value: "B" }, 1);
			crdt.applyOp({ action: "createNode", nodeId: "a-node", nodeType: TreeNodeType.String, value: "A" }, 2);

			// 同一位置(0)并发插入，相同seq
			crdt.applyOp({ action: "insertChild", parentId: "arr", index: 0, childNodeId: "b-node" }, 3);
			crdt.applyOp({ action: "insertChild", parentId: "arr", index: 0, childNodeId: "a-node" }, 3);

			const children = arr.getSortedChildren();
			// 同 targetIndex(0)、同 insertSeq(3)，按 nodeId 字典序: a-node < b-node
			expect(children).toEqual(["a-node", "b-node"]);
		});

		it("不同位置并发插入应各自保持正确位置", () => {
			const nodes = new Map<string, TreeNode>();
			const arr = new TreeNode("arr", TreeNodeType.Array);
			nodes.set("arr", arr);
			const crdt = new TreeCrdt(nodes);

			crdt.applyOp({ action: "createNode", nodeId: "n1", nodeType: TreeNodeType.String, value: "A" }, 1);
			crdt.applyOp({ action: "createNode", nodeId: "n2", nodeType: TreeNodeType.String, value: "B" }, 2);

			crdt.applyOp({ action: "insertChild", parentId: "arr", index: 0, childNodeId: "n1" }, 3);
			crdt.applyOp({ action: "insertChild", parentId: "arr", index: 1, childNodeId: "n2" }, 4);

			const children = arr.getSortedChildren();
			expect(children).toEqual(["n1", "n2"]);
		});

		it("三方同位置并发插入应一致排序", () => {
			const nodes = new Map<string, TreeNode>();
			const arr = new TreeNode("arr", TreeNodeType.Array);
			nodes.set("arr", arr);
			const crdt = new TreeCrdt(nodes);

			crdt.applyOp({ action: "createNode", nodeId: "c", nodeType: TreeNodeType.Number, value: 3 }, 1);
			crdt.applyOp({ action: "createNode", nodeId: "a", nodeType: TreeNodeType.Number, value: 1 }, 2);
			crdt.applyOp({ action: "createNode", nodeId: "b", nodeType: TreeNodeType.Number, value: 2 }, 3);

			// 同一位置(0)、同一seq(5)
			crdt.applyOp({ action: "insertChild", parentId: "arr", index: 0, childNodeId: "c" }, 5);
			crdt.applyOp({ action: "insertChild", parentId: "arr", index: 0, childNodeId: "a" }, 5);
			crdt.applyOp({ action: "insertChild", parentId: "arr", index: 0, childNodeId: "b" }, 5);

			const children = arr.getSortedChildren();
			expect(children).toEqual(["a", "b", "c"]);
		});

		it("已存在的子节点不应重复插入", () => {
			const nodes = new Map<string, TreeNode>();
			const arr = new TreeNode("arr", TreeNodeType.Array);
			nodes.set("arr", arr);
			const crdt = new TreeCrdt(nodes);

			crdt.applyOp({ action: "createNode", nodeId: "n1", nodeType: TreeNodeType.String }, 1);
			crdt.applyOp({ action: "insertChild", parentId: "arr", index: 0, childNodeId: "n1" }, 2);
			crdt.applyOp({ action: "insertChild", parentId: "arr", index: 0, childNodeId: "n1" }, 3);

			expect(arr.childrenMeta!.length).toBe(1);
		});
	});

	describe("并发属性设置（LWW）", () => {
		it("较高序列号的 setProperty 应覆盖较低序列号", () => {
			const nodes = createNodes();
			const crdt = new TreeCrdt(nodes);

			crdt.applyOp({ action: "createNode", nodeId: "v1", nodeType: TreeNodeType.String, value: "old" }, 1);
			crdt.applyOp({ action: "createNode", nodeId: "v2", nodeType: TreeNodeType.String, value: "new" }, 2);

			crdt.applyOp({ action: "setProperty", nodeId: "root", key: "name", childNodeId: "v1" }, 3);
			crdt.applyOp({ action: "setProperty", nodeId: "root", key: "name", childNodeId: "v2" }, 5);

			expect(nodes.get("root")!.properties!.get("name")).toBe("v2");
		});

		it("较低序列号的 setProperty 应被忽略", () => {
			const nodes = createNodes();
			const crdt = new TreeCrdt(nodes);

			crdt.applyOp({ action: "createNode", nodeId: "v1", nodeType: TreeNodeType.String, value: "first" }, 1);
			crdt.applyOp({ action: "createNode", nodeId: "v2", nodeType: TreeNodeType.String, value: "second" }, 2);

			crdt.applyOp({ action: "setProperty", nodeId: "root", key: "name", childNodeId: "v1" }, 5);
			crdt.applyOp({ action: "setProperty", nodeId: "root", key: "name", childNodeId: "v2" }, 3);

			expect(nodes.get("root")!.properties!.get("name")).toBe("v1");
		});

		it("同一属性的 delete 和 set 应按 LWW 解决", () => {
			const nodes = createNodes();
			const crdt = new TreeCrdt(nodes);

			crdt.applyOp({ action: "createNode", nodeId: "v1", nodeType: TreeNodeType.String, value: "val" }, 1);
			crdt.applyOp({ action: "setProperty", nodeId: "root", key: "name", childNodeId: "v1" }, 3);

			// deleteProperty seq=5 > setProperty seq=3，属性应被删除
			crdt.applyOp({ action: "deleteProperty", nodeId: "root", key: "name" }, 5);
			expect(nodes.get("root")!.properties!.has("name")).toBe(false);
		});
	});

	describe("并发删除与修改", () => {
		it("对已删除节点的 setProperty 应被静默忽略", () => {
			const nodes = createNodes();
			const crdt = new TreeCrdt(nodes);

			crdt.applyOp({ action: "createNode", nodeId: "obj", nodeType: TreeNodeType.Object }, 1);
			crdt.applyOp({ action: "createNode", nodeId: "v1", nodeType: TreeNodeType.String, value: "test" }, 2);
			crdt.applyOp({ action: "deleteNode", nodeId: "obj" }, 3);
			crdt.applyOp({ action: "setProperty", nodeId: "obj", key: "k", childNodeId: "v1" }, 4);

			expect(nodes.get("obj")!.properties!.size).toBe(0);
		});

		it("对已删除节点的 setValue 应被静默忽略", () => {
			const nodes = createNodes();
			const crdt = new TreeCrdt(nodes);

			crdt.applyOp({ action: "createNode", nodeId: "n1", nodeType: TreeNodeType.String, value: "old" }, 1);
			crdt.applyOp({ action: "deleteNode", nodeId: "n1" }, 2);
			crdt.applyOp({ action: "setValue", nodeId: "n1", value: "new" }, 3);

			expect(nodes.get("n1")!.value).toBe("old");
		});

		it("对已删除节点的 insertChild 应被静默忽略", () => {
			const nodes = new Map<string, TreeNode>();
			const arr = new TreeNode("arr", TreeNodeType.Array);
			nodes.set("arr", arr);
			const crdt = new TreeCrdt(nodes);

			crdt.applyOp({ action: "createNode", nodeId: "child", nodeType: TreeNodeType.String }, 1);
			arr.deleted = true;
			arr.deletedSeq = 2;
			crdt.applyOp({ action: "insertChild", parentId: "arr", index: 0, childNodeId: "child" }, 3);

			expect(arr.childrenMeta!.length).toBe(0);
		});

		it("删除应递归标记所有后代节点", () => {
			const nodes = createNodes();
			const crdt = new TreeCrdt(nodes);

			crdt.applyOp({ action: "createNode", nodeId: "child", nodeType: TreeNodeType.Object }, 1);
			crdt.applyOp({ action: "createNode", nodeId: "grandchild", nodeType: TreeNodeType.String, value: "deep" }, 2);
			crdt.applyOp({ action: "setProperty", nodeId: "root", key: "c", childNodeId: "child" }, 3, true);
			crdt.applyOp({ action: "setProperty", nodeId: "child", key: "gc", childNodeId: "grandchild" }, 4, true);

			crdt.applyOp({ action: "deleteNode", nodeId: "child" }, 5);

			expect(nodes.get("child")!.deleted).toBe(true);
			expect(nodes.get("grandchild")!.deleted).toBe(true);
		});
	});

	describe("并发移动冲突", () => {
		it("较高序列号的移动应覆盖较低序列号的移动", () => {
			const nodes = createNodes();
			const crdt = new TreeCrdt(nodes);

			crdt.applyOp({ action: "createNode", nodeId: "parent1", nodeType: TreeNodeType.Object }, 1);
			crdt.applyOp({ action: "createNode", nodeId: "parent2", nodeType: TreeNodeType.Object }, 2);
			crdt.applyOp({ action: "createNode", nodeId: "child", nodeType: TreeNodeType.String, value: "x" }, 3);
			crdt.applyOp({ action: "setProperty", nodeId: "root", key: "p1", childNodeId: "parent1" }, 4, true);
			crdt.applyOp({ action: "setProperty", nodeId: "root", key: "p2", childNodeId: "parent2" }, 5, true);

			// 第一次移动到 parent1
			crdt.applyOp({ action: "moveNode", nodeId: "child", newParentId: "parent1", key: "c" }, 6);
			expect(nodes.get("child")!.parentId).toBe("parent1");

			// 第二次移动到 parent2（seq更高，应覆盖）
			crdt.applyOp({ action: "moveNode", nodeId: "child", newParentId: "parent2", key: "c" }, 8);
			expect(nodes.get("child")!.parentId).toBe("parent2");
		});

		it("移动操作应检测并拒绝环路", () => {
			const nodes = createNodes();
			const crdt = new TreeCrdt(nodes);

			crdt.applyOp({ action: "createNode", nodeId: "a", nodeType: TreeNodeType.Object }, 1);
			crdt.applyOp({ action: "createNode", nodeId: "b", nodeType: TreeNodeType.Object }, 2);
			crdt.applyOp({ action: "setProperty", nodeId: "root", key: "a", childNodeId: "a" }, 3, true);
			crdt.applyOp({ action: "setProperty", nodeId: "a", key: "b", childNodeId: "b" }, 4, true);

			// 尝试将 root 移动到 b 下（会形成环路: root -> a -> b -> root）
			expect(crdt.detectCycle("root", "b")).toBe(true);

			// moveNode 应忽略环路
			crdt.applyOp({ action: "moveNode", nodeId: "root", newParentId: "b", key: "x" }, 5);
			expect(nodes.get("root")!.parentId).toBe(null);
		});

		it("移动已删除的节点应被忽略", () => {
			const nodes = createNodes();
			const crdt = new TreeCrdt(nodes);

			crdt.applyOp({ action: "createNode", nodeId: "target", nodeType: TreeNodeType.Object }, 1);
			crdt.applyOp({ action: "createNode", nodeId: "child", nodeType: TreeNodeType.String }, 2);
			crdt.applyOp({ action: "setProperty", nodeId: "root", key: "t", childNodeId: "target" }, 3, true);
			crdt.applyOp({ action: "deleteNode", nodeId: "child" }, 4);
			crdt.applyOp({ action: "moveNode", nodeId: "child", newParentId: "target", key: "x" }, 5);

			expect(nodes.get("child")!.parentId).toBe(null);
		});
	});

	describe("批量操作", () => {
		it("应按顺序应用批量操作中的每个 op", () => {
			const nodes = createNodes();
			const crdt = new TreeCrdt(nodes);

			crdt.applyBatch({
				action: "batch",
				transactionId: "tx1",
				ops: [
					{ action: "createNode", nodeId: "n1", nodeType: TreeNodeType.String, value: "hello" },
					{ action: "createNode", nodeId: "n2", nodeType: TreeNodeType.Number, value: 42 },
					{ action: "setProperty", nodeId: "root", key: "a", childNodeId: "n1" },
					{ action: "setProperty", nodeId: "root", key: "b", childNodeId: "n2" },
				],
			}, 10, true);

			expect(nodes.get("n1")!.value).toBe("hello");
			expect(nodes.get("n2")!.value).toBe(42);
			expect(nodes.get("root")!.properties!.get("a")).toBe("n1");
			expect(nodes.get("root")!.properties!.get("b")).toBe("n2");
		});
	});
});
