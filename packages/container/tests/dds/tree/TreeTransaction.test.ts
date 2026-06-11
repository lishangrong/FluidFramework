import { describe, it, expect, vi } from "vitest";
import { TreeTransaction } from "../../../src/dds/tree/TreeTransaction.js";
import { TreeNodeType } from "../../../src/interfaces/ISharedTree.js";
import type { ITreeHost } from "../../../src/dds/tree/TreeTransaction.js";
import type { ITreeOp } from "../../../src/dds/tree/TreeOps.js";

function createMockHost(): ITreeHost {
	const snapshot = new Uint8Array([1, 2, 3]);
	return {
		applyOpLocally: vi.fn(),
		submitOp: vi.fn().mockResolvedValue(undefined),
		snapshot: vi.fn().mockReturnValue(snapshot),
		loadFromSnapshot: vi.fn(),
	};
}

describe("TreeTransaction", () => {
	it("事务内操作应通过 host.applyOpLocally 立即应用", () => {
		const host = createMockHost();
		const tx = new TreeTransaction(host);
		tx.createNode(TreeNodeType.String, "hello");
		expect(host.applyOpLocally).toHaveBeenCalledTimes(1);
		const call = (host.applyOpLocally as ReturnType<typeof vi.fn>).mock.calls[0][0] as ITreeOp;
		expect(call.action).toBe("createNode");
	});

	it("commit 应将所有操作打包提交", () => {
		const host = createMockHost();
		const tx = new TreeTransaction(host);
		tx.createNode(TreeNodeType.String, "a");
		tx.createNode(TreeNodeType.Number, 1);
		tx.commit();

		expect(host.submitOp).toHaveBeenCalledTimes(1);
		const batchOp = (host.submitOp as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(batchOp.action).toBe("batch");
		expect(batchOp.ops).toHaveLength(2);
	});

	it("rollback 应恢复到事务开始时的状态", () => {
		const host = createMockHost();
		const tx = new TreeTransaction(host);
		tx.createNode(TreeNodeType.String, "temp");
		tx.rollback();
		expect(host.loadFromSnapshot).toHaveBeenCalledTimes(1);
	});

	it("commit 后事务应标记为 ended", () => {
		const host = createMockHost();
		const tx = new TreeTransaction(host);
		tx.commit();
		expect(tx.ended).toBe(true);
	});

	it("rollback 后事务应标记为 ended", () => {
		const host = createMockHost();
		const tx = new TreeTransaction(host);
		tx.rollback();
		expect(tx.ended).toBe(true);
	});

	it("对已结束的事务操作应抛出 TreeTransactionEnded", () => {
		const host = createMockHost();
		const tx = new TreeTransaction(host);
		tx.commit();
		expect(() => tx.createNode(TreeNodeType.String, "x")).toThrow("事务已结束");
		expect(() => tx.deleteNode("x")).toThrow("事务已结束");
		expect(() => tx.setProperty("x", "k", "v")).toThrow("事务已结束");
		expect(() => tx.commit()).toThrow("事务已结束");
		expect(() => tx.rollback()).toThrow("事务已结束");
	});

	it("空事务 commit 应安全返回", () => {
		const host = createMockHost();
		const tx = new TreeTransaction(host);
		tx.commit();
		expect(host.submitOp).not.toHaveBeenCalled();
		expect(tx.ended).toBe(true);
	});

	it("多步事务应正确收集所有操作", () => {
		const host = createMockHost();
		const tx = new TreeTransaction(host);
		const id1 = tx.createNode(TreeNodeType.String, "hello");
		tx.setProperty("root", "name", id1);
		tx.setValue(id1, "world");
		tx.commit();

		const batchOp = (host.submitOp as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(batchOp.ops).toHaveLength(3);
		expect(batchOp.ops[0].action).toBe("createNode");
		expect(batchOp.ops[1].action).toBe("setProperty");
		expect(batchOp.ops[2].action).toBe("setValue");
	});

	it("应支持所有操作类型", () => {
		const host = createMockHost();
		const tx = new TreeTransaction(host);
		tx.createNode(TreeNodeType.Object);
		tx.deleteNode("n1");
		tx.setProperty("n2", "k", "n3");
		tx.deleteProperty("n2", "k");
		tx.insertChild("arr", 0, "n4");
		tx.removeChild("arr", "n4");
		tx.setValue("n5", 42);
		tx.moveNode("n6", "n7", "key", 0);
		tx.commit();

		const batchOp = (host.submitOp as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(batchOp.ops).toHaveLength(8);
	});
});
