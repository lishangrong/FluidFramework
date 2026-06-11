import { describe, it, expect, vi } from "vitest";
import { TypedEventEmitter } from "../../src/utils/EventEmitter.js";

interface TestEvents {
	[key: string]: (...args: any[]) => void;
	hello: (name: string) => void;
	count: (n: number) => void;
	error: (err: Error) => void;
}

class TestEmitter extends TypedEventEmitter<TestEvents> {
	doEmit<K extends keyof TestEvents & string>(
		event: K,
		...args: Parameters<TestEvents[K]>
	): boolean {
		return this.safeEmit(event, ...args);
	}
}

describe("TypedEventEmitter", () => {
	it("应触发并接收事件", () => {
		const emitter = new TestEmitter();
		const listener = vi.fn();
		emitter.on("hello", listener);
		emitter.doEmit("hello", "world");
		expect(listener).toHaveBeenCalledWith("world");
	});

	it("应支持取消监听", () => {
		const emitter = new TestEmitter();
		const listener = vi.fn();
		emitter.on("hello", listener);
		emitter.off("hello", listener);
		emitter.doEmit("hello", "world");
		expect(listener).not.toHaveBeenCalled();
	});

	it("应返回正确的监听器数量", () => {
		const emitter = new TestEmitter();
		expect(emitter.listenerCount("hello")).toBe(0);
		const listener = vi.fn();
		emitter.on("hello", listener);
		expect(emitter.listenerCount("hello")).toBe(1);
	});

	it("safeEmit 应捕获监听器异常并触发 error 事件", () => {
		const emitter = new TestEmitter();
		const errorListener = vi.fn();
		emitter.on("error", errorListener);
		emitter.on("hello", () => {
			throw new Error("监听器异常");
		});
		emitter.doEmit("hello", "test");
		expect(errorListener).toHaveBeenCalled();
		expect(errorListener.mock.calls[0][0]).toBeInstanceOf(Error);
	});

	it("应支持移除所有监听器", () => {
		const emitter = new TestEmitter();
		emitter.on("hello", vi.fn());
		emitter.on("count", vi.fn());
		emitter.removeAllListeners();
		expect(emitter.listenerCount("hello")).toBe(0);
		expect(emitter.listenerCount("count")).toBe(0);
	});

	it("应支持移除指定事件的监听器", () => {
		const emitter = new TestEmitter();
		emitter.on("hello", vi.fn());
		emitter.on("count", vi.fn());
		emitter.removeAllListeners("hello");
		expect(emitter.listenerCount("hello")).toBe(0);
		expect(emitter.listenerCount("count")).toBe(1);
	});
});
