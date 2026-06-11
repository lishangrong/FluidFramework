import { describe, it, expect } from "vitest";
import { SnapshotManager } from "../../src/snapshot/SnapshotManager.js";
import { ContainerRuntime } from "../../src/runtime/ContainerRuntime.js";
import { ContainerSchema } from "../../src/schema/ContainerSchema.js";
import { BinarySerializer } from "../../src/serialization/BinarySerializer.js";
import type { SharedMap } from "../../src/dds/SharedMap.js";
import type { SharedCounter } from "../../src/dds/SharedCounter.js";

describe("SnapshotManager", () => {
	function createTestSetup() {
		const runtime = new ContainerRuntime("c1");
		const schema = new ContainerSchema({
			initialObjects: { map: "SharedMap", counter: "SharedCounter" },
		});
		const serializer = new BinarySerializer();
		const manager = new SnapshotManager(runtime, schema, serializer);
		return { runtime, schema, serializer, manager };
	}

	it("应创建快照", async () => {
		const { runtime, manager } = createTestSetup();
		const map = runtime.createObject<SharedMap>("SharedMap", "map");
		map.set("key", "value");
		runtime.createObject("SharedCounter", "counter");

		const result = await manager.createSnapshot("c1");
		expect(result.containerId).toBe("c1");
		expect(result.tree).toBeDefined();
		expect(result.binaryData).toBeInstanceOf(Uint8Array);
		expect(result.binaryData.length).toBeGreaterThan(0);
		expect(result.timestamp).toBeGreaterThan(0);
	});

	it("应从快照恢复状态", async () => {
		const { runtime: r1, manager: m1 } = createTestSetup();
		const map1 = r1.createObject<SharedMap>("SharedMap", "map");
		map1.set("a", 1);
		map1.set("b", "hello");
		const counter1 = r1.createObject<SharedCounter>("SharedCounter", "counter");
		counter1.increment(42);

		const snapshot = await m1.createSnapshot("c1");

		// 创建新的运行时并恢复
		const { runtime: r2, manager: m2 } = createTestSetup();
		r2.createObject("SharedMap", "map");
		r2.createObject("SharedCounter", "counter");
		await m2.restoreFromSnapshot(snapshot);

		const map2 = r2.getObject<SharedMap>("map")!;
		expect(map2.get("a")).toBe(1);
		expect(map2.get("b")).toBe("hello");

		const counter2 = r2.getObject<SharedCounter>("counter")!;
		expect(counter2.getValue()).toBe(42);
	});

	it("空容器也应能创建快照", async () => {
		const { runtime, manager } = createTestSetup();
		runtime.createObject("SharedMap", "map");
		runtime.createObject("SharedCounter", "counter");
		const result = await manager.createSnapshot("c1");
		expect(result.tree.trees).toHaveProperty("map");
		expect(result.tree.trees).toHaveProperty("counter");
	});
});
