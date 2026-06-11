import { describe, it, expect } from "vitest";
import { SnapshotBuilder } from "../../src/snapshot/SnapshotBuilder.js";
import { ContainerRuntime } from "../../src/runtime/ContainerRuntime.js";
import { ContainerSchema } from "../../src/schema/ContainerSchema.js";
import { BinarySerializer } from "../../src/serialization/BinarySerializer.js";
import type { SharedMap } from "../../src/dds/SharedMap.js";

describe("SnapshotBuilder", () => {
	it("应构建正确的快照树结构", () => {
		const runtime = new ContainerRuntime("c1");
		const map = runtime.createObject<SharedMap>("SharedMap", "map1");
		map.set("key", "value");

		const schema = new ContainerSchema({
			initialObjects: { map1: "SharedMap" },
		});
		const serializer = new BinarySerializer();
		const tree = SnapshotBuilder.build("c1", runtime, schema, serializer);

		expect(tree.id).toBe("c1");
		expect(tree.blobs).toHaveProperty("metadata");
		expect(tree.trees).toHaveProperty("map1");
		expect(tree.trees["map1"].blobs).toHaveProperty("content");
	});

	it("应为每个 DDS 创建子树", () => {
		const runtime = new ContainerRuntime("c1");
		runtime.createObject("SharedMap", "m1");
		runtime.createObject("SharedCounter", "c1");
		runtime.createObject("SharedString", "s1");

		const schema = new ContainerSchema({
			initialObjects: { m1: "SharedMap" },
		});
		const serializer = new BinarySerializer();
		const tree = SnapshotBuilder.build("container1", runtime, schema, serializer);

		expect(Object.keys(tree.trees)).toHaveLength(3);
		expect(tree.trees).toHaveProperty("m1");
		expect(tree.trees).toHaveProperty("c1");
		expect(tree.trees).toHaveProperty("s1");
	});

	it("元数据 blob 应包含容器信息", () => {
		const runtime = new ContainerRuntime("c1");
		runtime.createObject("SharedMap", "m");

		const schema = new ContainerSchema({
			initialObjects: { m: "SharedMap" },
		});
		const serializer = new BinarySerializer();
		const tree = SnapshotBuilder.build("c1", runtime, schema, serializer);

		// 解码元数据
		const metadataBase64 = tree.blobs["metadata"];
		const metadataBytes = new Uint8Array(Buffer.from(metadataBase64, "base64"));
		const metadata = serializer.decode(metadataBytes) as Record<string, unknown>;
		expect(metadata).toHaveProperty("containerId", "c1");
		expect(metadata).toHaveProperty("schema");
	});
});
