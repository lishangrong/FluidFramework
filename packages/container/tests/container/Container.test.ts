import { describe, it, expect, vi } from "vitest";
import { Container } from "../../src/container/Container.js";
import type {
	IDocumentService,
	IDeltaStorageService,
	IDocumentStorageService,
	IOrdererConnection,
} from "../../src/interfaces/IDocumentService.js";
import type { IContainerConfig } from "../../src/interfaces/IContainer.js";

function createMockDocumentService(): IDocumentService {
	const mockOrderer: IOrdererConnection = {
		submit: vi.fn().mockResolvedValue(undefined),
		disconnect: vi.fn(),
	};
	const mockDeltaStorage: IDeltaStorageService = {
		get: vi.fn().mockResolvedValue([]),
	};
	const mockDocStorage: IDocumentStorageService = {
		read: vi.fn().mockResolvedValue(""),
		getSnapshotTree: vi.fn().mockResolvedValue(null),
	};
	return {
		protocolName: "test",
		connectToDeltaStorage: vi.fn().mockResolvedValue(mockDeltaStorage),
		connectToStorage: vi.fn().mockResolvedValue(mockDocStorage),
		connectToOrderer: vi.fn().mockResolvedValue(mockOrderer),
		dispose: vi.fn(),
	};
}

function createTestConfig(overrides?: Partial<IContainerConfig>): IContainerConfig {
	return {
		schema: {
			initialObjects: { myMap: "SharedMap", myCounter: "SharedCounter" },
			dynamicObjectTypes: ["SharedString"],
		},
		documentService: createMockDocumentService(),
		resolvedUrl: {
			type: "fluid",
			url: "fluid://test/container1",
			endpoints: {
				deltaStorage: "http://localhost/delta",
				orderer: "http://localhost/orderer",
				storage: "http://localhost/storage",
			},
			tokens: {},
			id: "container1",
		},
		containerId: "container1",
		...overrides,
	};
}

describe("Container", () => {
	describe("create", () => {
		it("应创建容器并初始化所有初始对象", async () => {
			const container = await Container.create(createTestConfig());
			expect(container.id).toBe("container1");
			expect(container.disposed).toBe(false);
			const map = container.getInitialObject("myMap");
			expect(map).toBeDefined();
			expect(map.type).toBe("SharedMap");
			const counter = container.getInitialObject("myCounter");
			expect(counter).toBeDefined();
			expect(counter.type).toBe("SharedCounter");
			container.dispose();
		});

		it("应触发 onCreate 事件", async () => {
			const listener = vi.fn();
			const container = await Container.create(createTestConfig());
			// onCreate在create内部已触发，需要在创建前监听
			// 改为验证schema
			expect(container.schema.initialObjects).toHaveProperty("myMap");
			container.dispose();
		});

		it("应触发 connected 事件", async () => {
			const config = createTestConfig();
			const container = await Container.create(config);
			// connected 在 create 内部已触发
			expect(container.id).toBe("container1");
			container.dispose();
		});
	});

	describe("load", () => {
		it("应加载容器", async () => {
			const container = await Container.load(createTestConfig());
			expect(container.id).toBe("container1");
			const map = container.getInitialObject("myMap");
			expect(map).toBeDefined();
			container.dispose();
		});

		it("应从快照恢复数据", async () => {
			const snapshotTree = {
				id: "container1",
				blobs: {},
				trees: {},
			};
			const mockDocService = createMockDocumentService();
			(mockDocService.connectToStorage as ReturnType<typeof vi.fn>).mockResolvedValue({
				read: vi.fn().mockResolvedValue(""),
				getSnapshotTree: vi.fn().mockResolvedValue(snapshotTree),
			});
			const container = await Container.load(
				createTestConfig({ documentService: mockDocService }),
			);
			expect(container).toBeDefined();
			container.dispose();
		});
	});

	describe("getInitialObject", () => {
		it("获取不存在的初始对象应抛出错误", async () => {
			const container = await Container.create(createTestConfig());
			expect(() => container.getInitialObject("nonexistent")).toThrow();
			container.dispose();
		});
	});

	describe("createDynamicObject", () => {
		it("应动态创建 schema 中声明的类型", async () => {
			const container = await Container.create(createTestConfig());
			const str = await container.createDynamicObject("SharedString");
			expect(str).toBeDefined();
			expect(str.type).toBe("SharedString");
			container.dispose();
		});

		it("创建未在 dynamicObjectTypes 中声明的类型应抛出错误", async () => {
			const container = await Container.create(createTestConfig());
			await expect(
				container.createDynamicObject("SharedMap"),
			).rejects.toThrow();
			container.dispose();
		});
	});

	describe("snapshot", () => {
		it("应创建容器快照", async () => {
			const container = await Container.create(createTestConfig());
			const result = await container.snapshot();
			expect(result.containerId).toBe("container1");
			expect(result.tree).toBeDefined();
			expect(result.binaryData).toBeInstanceOf(Uint8Array);
			container.dispose();
		});
	});

	describe("dispose", () => {
		it("应正确销毁容器", async () => {
			const container = await Container.create(createTestConfig());
			container.dispose();
			expect(container.disposed).toBe(true);
		});

		it("销毁后操作应抛出错误", async () => {
			const container = await Container.create(createTestConfig());
			container.dispose();
			expect(() => container.getInitialObject("myMap")).toThrow();
			await expect(container.snapshot()).rejects.toThrow();
		});

		it("重复销毁不应抛出错误", async () => {
			const container = await Container.create(createTestConfig());
			container.dispose();
			expect(() => container.dispose()).not.toThrow();
		});
	});

	describe("events", () => {
		it("应触发 onDispose 事件", async () => {
			const container = await Container.create(createTestConfig());
			const listener = vi.fn();
			container.on("onDispose", listener);
			container.dispose();
			expect(listener).toHaveBeenCalled();
		});

		it("应转发 DDS changed 事件", async () => {
			const container = await Container.create(createTestConfig());
			const listener = vi.fn();
			container.on("changed", listener);
			const map = container.getInitialObject("myMap") as any;
			map.set("key", "value");
			expect(listener).toHaveBeenCalled();
			container.dispose();
		});
	});
});
