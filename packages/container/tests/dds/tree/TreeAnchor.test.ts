import { describe, it, expect } from "vitest";
import { TreeAnchor } from "../../../src/dds/tree/TreeAnchor.js";
import { TreeNodeType } from "../../../src/interfaces/ISharedTree.js";
import type { ITreeNodeView } from "../../../src/interfaces/ISharedTree.js";

function makeView(id: string, deleted = false): ITreeNodeView {
	return { id, type: TreeNodeType.String, parentId: null, parentKey: null, deleted, value: "test" };
}

describe("TreeAnchor", () => {
	it("应正确创建锚点并 resolve 到目标节点", () => {
		const view = makeView("n1");
		const anchor = new TreeAnchor("n1", () => view, () => {});
		expect(anchor.resolve()).toEqual(view);
	});

	it("目标节点被删除后 resolve 应返回 undefined", () => {
		const view = makeView("n1", true);
		const anchor = new TreeAnchor("n1", () => view, () => {});
		expect(anchor.resolve()).toBeUndefined();
	});

	it("节点不存在时 resolve 应返回 undefined", () => {
		const anchor = new TreeAnchor("n1", () => undefined, () => {});
		expect(anchor.resolve()).toBeUndefined();
	});

	it("dispose 后再 resolve 应抛出 TreeAnchorDisposed 错误", () => {
		const view = makeView("n1");
		const anchor = new TreeAnchor("n1", () => view, () => {});
		anchor.dispose();
		expect(() => anchor.resolve()).toThrow("锚点已释放");
	});

	it("dispose 应调用清理回调", () => {
		let cleaned = false;
		const anchor = new TreeAnchor("n1", () => undefined, () => { cleaned = true; });
		anchor.dispose();
		expect(cleaned).toBe(true);
	});

	it("重复 dispose 应安全执行", () => {
		let count = 0;
		const anchor = new TreeAnchor("n1", () => undefined, () => { count++; });
		anchor.dispose();
		anchor.dispose();
		expect(count).toBe(1);
	});

	it("多个锚点指向同一节点应独立工作", () => {
		const view = makeView("n1");
		const a1 = new TreeAnchor("n1", () => view, () => {});
		const a2 = new TreeAnchor("n1", () => view, () => {});
		a1.dispose();
		expect(() => a1.resolve()).toThrow();
		expect(a2.resolve()).toEqual(view);
	});
});
