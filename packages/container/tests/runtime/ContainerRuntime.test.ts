import { describe, it, expect, vi } from "vitest";
import { ContainerRuntime } from "../../src/runtime/ContainerRuntime.js";
import { SharedMap } from "../../src/dds/SharedMap.js";
import type { IOrdererConnection } from "../../src/interfaces/IDocumentService.js";

function createMockOrderer(): IOrdererConnection {
	return {
		submit: vi.fn().mockResolvedValue(undefined),
		disconnect: vi.fn(),
	};
}

describe("ContainerRuntime", () => {
	it("应创建 DDS 实例", () => {
		const runtime = new ContainerRuntime("c1");
		const obj = runtime.createObject("SharedMap", "map1");
		expect(obj).toBeDefined();
		expect(obj.id).toBe("map1");
	});

	it("应获取已创建的 DDS 实例", () => {
		const runtime = new ContainerRuntime("c1");
		runtime.createObject("SharedMap", "map1");
		const obj = runtime.getObject("map1");
		expect(obj).toBeDefined();
		expect(obj!.id).toBe("map1");
	});

	it("获取不存在的 DDS 应返回 undefined", () => {
		const runtime = new ContainerRuntime("c1");
		expect(runtime.getObject("nonexistent")).toBeUndefined();
	});

	it("创建同 ID 的 DDS 应抛出错误", () => {
		const runtime = new ContainerRuntime("c1");
		runtime.createObject("SharedMap", "map1");
		expect(() => runtime.createObject("SharedMap", "map1")).toThrow();
	});

	it("未指定 ID 时应自动生成", () => {
		const runtime = new ContainerRuntime("c1");
		const obj = runtime.createObject("SharedMap");
		expect(obj.id).toBeTruthy();
		expect(obj.id.length).toBeGreaterThan(0);
	});

	it("应通过排序服务提交操作", async () => {
		const runtime = new ContainerRuntime("c1");
		const orderer = createMockOrderer();
		runtime.connectOrderer(orderer);
		const map = runtime.createObject<SharedMap>("SharedMap", "map1");
		map.set("key", "value");
		// 等待异步提交完成
		await vi.waitFor(() => {
			expect(orderer.submit).toHaveBeenCalled();
		});
	});

	it("应路由远端操作到正确的 DDS", () => {
		const runtime = new ContainerRuntime("c1");
		const map = runtime.createObject<SharedMap>("SharedMap", "map1");
		runtime.processRemoteOp({
			sequenceNumber: 1,
			contents: {
				objectId: "map1",
				op: { action: "set", key: "remote", value: 99 },
			},
		});
		expect(map.get("remote")).toBe(99);
	});

	it("应忽略目标不存在的远端操作", () => {
		const runtime = new ContainerRuntime("c1");
		expect(() =>
			runtime.processRemoteOp({
				sequenceNumber: 1,
				contents: { objectId: "nonexistent", op: {} },
			}),
		).not.toThrow();
	});

	it("snapshotAll 应返回所有 DDS 的快照", () => {
		const runtime = new ContainerRuntime("c1");
		const map = runtime.createObject<SharedMap>("SharedMap", "map1");
		map.set("key", "value");
		runtime.createObject("SharedCounter", "cnt1");
		const snapshots = runtime.snapshotAll();
		expect(snapshots.size).toBe(2);
		expect(snapshots.has("map1")).toBe(true);
		expect(snapshots.has("cnt1")).toBe(true);
	});

	it("loadAll 应恢复 DDS 状态", () => {
		const r1 = new ContainerRuntime("c1");
		const map1 = r1.createObject<SharedMap>("SharedMap", "map1");
		map1.set("a", 1);
		const snapshots = r1.snapshotAll();

		const r2 = new ContainerRuntime("c2");
		r2.createObject("SharedMap", "map1");
		r2.loadAll(snapshots);
		const map2 = r2.getObject<SharedMap>("map1")!;
		expect(map2.get("a")).toBe(1);
	});

	it("应跟踪最后序列号", () => {
		const runtime = new ContainerRuntime("c1");
		runtime.createObject("SharedMap", "m");
		expect(runtime.getLastSequenceNumber()).toBe(0);
		runtime.processRemoteOp({
			sequenceNumber: 5,
			contents: { objectId: "m", op: { action: "set", key: "k", value: 1 } },
		});
		expect(runtime.getLastSequenceNumber()).toBe(5);
	});

	it("dispose 应销毁所有 DDS", () => {
		const runtime = new ContainerRuntime("c1");
		const orderer = createMockOrderer();
		runtime.connectOrderer(orderer);
		const map = runtime.createObject<SharedMap>("SharedMap", "map1");
		runtime.dispose();
		expect(map.disposed).toBe(true);
		expect(orderer.disconnect).toHaveBeenCalled();
	});

	it("getRegisteredTypes 应返回已注册类型", () => {
		const runtime = new ContainerRuntime("c1");
		const types = runtime.getRegisteredTypes();
		expect(types.has("SharedMap")).toBe(true);
		expect(types.has("SharedString")).toBe(true);
		expect(types.has("SharedCounter")).toBe(true);
	});
});
