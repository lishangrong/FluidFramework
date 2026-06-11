import { describe, it, expect } from "vitest";
import { DdsFactory } from "../../src/dds/DdsFactory.js";
import { SharedMap } from "../../src/dds/SharedMap.js";
import { SharedString } from "../../src/dds/SharedString.js";
import { SharedCounter } from "../../src/dds/SharedCounter.js";

describe("DdsFactory", () => {
	it("应预注册内置类型", () => {
		const factory = new DdsFactory();
		expect(factory.hasType("SharedMap")).toBe(true);
		expect(factory.hasType("SharedString")).toBe(true);
		expect(factory.hasType("SharedCounter")).toBe(true);
	});

	it("应创建 SharedMap 实例", () => {
		const factory = new DdsFactory();
		const obj = factory.create("SharedMap", "map1");
		expect(obj).toBeInstanceOf(SharedMap);
		expect(obj.id).toBe("map1");
	});

	it("应创建 SharedString 实例", () => {
		const factory = new DdsFactory();
		const obj = factory.create("SharedString", "str1");
		expect(obj).toBeInstanceOf(SharedString);
	});

	it("应创建 SharedCounter 实例", () => {
		const factory = new DdsFactory();
		const obj = factory.create("SharedCounter", "cnt1");
		expect(obj).toBeInstanceOf(SharedCounter);
	});

	it("创建未注册类型应抛出错误", () => {
		const factory = new DdsFactory();
		expect(() => factory.create("UnknownType", "id")).toThrow();
	});

	it("重复注册同一类型应抛出错误", () => {
		const factory = new DdsFactory();
		expect(() =>
			factory.register("SharedMap", (id) => new SharedMap(id)),
		).toThrow();
	});

	it("应支持注册自定义类型", () => {
		const factory = new DdsFactory();
		factory.register("CustomMap", (id) => new SharedMap(id));
		expect(factory.hasType("CustomMap")).toBe(true);
		const obj = factory.create("CustomMap", "c1");
		expect(obj.id).toBe("c1");
	});

	it("getRegisteredTypes 应返回所有已注册类型", () => {
		const factory = new DdsFactory();
		const types = factory.getRegisteredTypes();
		expect(types.has("SharedMap")).toBe(true);
		expect(types.has("SharedString")).toBe(true);
		expect(types.has("SharedCounter")).toBe(true);
	});
});
