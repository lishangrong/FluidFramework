import { describe, it, expect, vi } from "vitest";
import { SharedString } from "../../src/dds/SharedString.js";

describe("SharedString", () => {
	it("初始内容应为空", () => {
		const str = new SharedString("str1");
		expect(str.getText()).toBe("");
		expect(str.getLength()).toBe(0);
	});

	it("应在指定位置插入文本", () => {
		const str = new SharedString("str1");
		str.insertText(0, "Hello");
		str.insertText(5, " World");
		expect(str.getText()).toBe("Hello World");
	});

	it("应在中间位置插入文本", () => {
		const str = new SharedString("str1");
		str.insertText(0, "HW");
		str.insertText(1, "ello orld");
		expect(str.getText()).toBe("Hello orldW");
	});

	it("应删除指定范围的文本", () => {
		const str = new SharedString("str1");
		str.insertText(0, "Hello World");
		str.removeText(5, 11);
		expect(str.getText()).toBe("Hello");
	});

	it("应替换指定范围的文本", () => {
		const str = new SharedString("str1");
		str.insertText(0, "Hello World");
		str.replaceText(6, 11, "Fluid");
		expect(str.getText()).toBe("Hello Fluid");
	});

	it("应钳位越界位置", () => {
		const str = new SharedString("str1");
		str.insertText(100, "text");
		expect(str.getText()).toBe("text");
		str.removeText(-5, 100);
		expect(str.getText()).toBe("");
	});

	it("应在变更时触发 changed 事件", () => {
		const str = new SharedString("str1");
		const listener = vi.fn();
		str.on("changed", listener);
		str.insertText(0, "test");
		expect(listener).toHaveBeenCalled();
	});

	it("快照和恢复应保持数据一致", () => {
		const str1 = new SharedString("str1");
		str1.insertText(0, "Hello World");
		const snapshot = str1.snapshot();

		const str2 = new SharedString("str2");
		str2.loadFromSnapshot(snapshot);
		expect(str2.getText()).toBe("Hello World");
	});

	it("应正确应用远端 insert 操作", () => {
		const str = new SharedString("str1");
		str.applyOp({ action: "insert", pos: 0, text: "remote" });
		expect(str.getText()).toBe("remote");
	});

	it("应正确应用远端 remove 操作", () => {
		const str = new SharedString("str1");
		str.insertText(0, "Hello World");
		str.applyOp({ action: "remove", pos: 5, end: 11 });
		expect(str.getText()).toBe("Hello");
	});

	it("类型标识应为 SharedString", () => {
		expect(new SharedString("s").type).toBe("SharedString");
	});
});
