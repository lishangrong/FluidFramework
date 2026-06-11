import { describe, it, expect, vi } from "vitest";
import { SharedMap } from "../../src/dds/SharedMap.js";

describe("SharedMap", () => {
	it("应正确设置和获取值", () => {
		const map = new SharedMap("map1");
		map.set("key1", "value1");
		expect(map.get("key1")).toBe("value1");
	});

	it("应返回正确的 size", () => {
		const map = new SharedMap("map1");
		expect(map.size).toBe(0);
		map.set("a", 1);
		map.set("b", 2);
		expect(map.size).toBe(2);
	});

	it("应正确删除键", () => {
		const map = new SharedMap("map1");
		map.set("key", "value");
		expect(map.delete("key")).toBe(true);
		expect(map.has("key")).toBe(false);
		expect(map.delete("nonexistent")).toBe(false);
	});

	it("应正确判断键是否存在", () => {
		const map = new SharedMap("map1");
		map.set("key", "value");
		expect(map.has("key")).toBe(true);
		expect(map.has("other")).toBe(false);
	});

	it("应返回所有键的迭代器", () => {
		const map = new SharedMap("map1");
		map.set("a", 1);
		map.set("b", 2);
		expect([...map.keys()]).toEqual(["a", "b"]);
	});

	it("应支持 forEach 遍历", () => {
		const map = new SharedMap("map1");
		map.set("x", 10);
		map.set("y", 20);
		const entries: [string, unknown][] = [];
		map.forEach((value, key) => entries.push([key, value]));
		expect(entries).toEqual([["x", 10], ["y", 20]]);
	});

	it("应在变更时触发 changed 事件", () => {
		const map = new SharedMap("map1");
		const listener = vi.fn();
		map.on("changed", listener);
		map.set("key", "value");
		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({ objectId: "map1", type: "SharedMap" }),
		);
	});

	it("快照和恢复应保持数据一致", () => {
		const map1 = new SharedMap("map1");
		map1.set("a", 1);
		map1.set("b", "hello");
		map1.set("c", true);
		const snapshot = map1.snapshot();

		const map2 = new SharedMap("map2");
		map2.loadFromSnapshot(snapshot);
		expect(map2.get("a")).toBe(1);
		expect(map2.get("b")).toBe("hello");
		expect(map2.get("c")).toBe(true);
		expect(map2.size).toBe(3);
	});

	it("应正确应用远端 set 操作", () => {
		const map = new SharedMap("map1");
		map.applyOp({ action: "set", key: "remote", value: 42 });
		expect(map.get("remote")).toBe(42);
	});

	it("应正确应用远端 delete 操作", () => {
		const map = new SharedMap("map1");
		map.set("key", "value");
		map.applyOp({ action: "delete", key: "key" });
		expect(map.has("key")).toBe(false);
	});

	it("类型标识应为 SharedMap", () => {
		const map = new SharedMap("map1");
		expect(map.type).toBe("SharedMap");
	});

	it("dispose 后应标记为已销毁", () => {
		const map = new SharedMap("map1");
		map.dispose();
		expect(map.disposed).toBe(true);
	});
});
