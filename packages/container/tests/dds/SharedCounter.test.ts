import { describe, it, expect, vi } from "vitest";
import { SharedCounter } from "../../src/dds/SharedCounter.js";

describe("SharedCounter", () => {
	it("初始值应为 0", () => {
		const counter = new SharedCounter("cnt1");
		expect(counter.getValue()).toBe(0);
	});

	it("应正确递增", () => {
		const counter = new SharedCounter("cnt1");
		counter.increment();
		expect(counter.getValue()).toBe(1);
		counter.increment(5);
		expect(counter.getValue()).toBe(6);
	});

	it("应正确递减", () => {
		const counter = new SharedCounter("cnt1");
		counter.increment(10);
		counter.decrement(3);
		expect(counter.getValue()).toBe(7);
	});

	it("默认递减 1", () => {
		const counter = new SharedCounter("cnt1");
		counter.increment(5);
		counter.decrement();
		expect(counter.getValue()).toBe(4);
	});

	it("应在变更时触发 changed 事件", () => {
		const counter = new SharedCounter("cnt1");
		const listener = vi.fn();
		counter.on("changed", listener);
		counter.increment();
		expect(listener).toHaveBeenCalled();
	});

	it("快照和恢复应保持数据一致", () => {
		const c1 = new SharedCounter("cnt1");
		c1.increment(42);
		const snapshot = c1.snapshot();

		const c2 = new SharedCounter("cnt2");
		c2.loadFromSnapshot(snapshot);
		expect(c2.getValue()).toBe(42);
	});

	it("应正确应用远端操作", () => {
		const counter = new SharedCounter("cnt1");
		counter.applyOp({ action: "increment", amount: 10 });
		expect(counter.getValue()).toBe(10);
		counter.applyOp({ action: "increment", amount: -3 });
		expect(counter.getValue()).toBe(7);
	});

	it("类型标识应为 SharedCounter", () => {
		expect(new SharedCounter("c").type).toBe("SharedCounter");
	});
});
