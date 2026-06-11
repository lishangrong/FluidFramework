import { describe, it, expect } from "vitest";
import { ContainerSchema } from "../../src/schema/ContainerSchema.js";

describe("ContainerSchema", () => {
	it("应正确创建有效的 schema", () => {
		const schema = new ContainerSchema({
			initialObjects: { map1: "SharedMap", counter1: "SharedCounter" },
			dynamicObjectTypes: ["SharedString"],
		});
		expect(schema.initialObjects.size).toBe(2);
		expect(schema.initialObjects.get("map1")).toBe("SharedMap");
		expect(schema.dynamicObjectTypes).toEqual(["SharedString"]);
	});

	it("应对空 initialObjects 抛出错误", () => {
		expect(() => new ContainerSchema({ initialObjects: {} })).toThrow();
	});

	it("应对无效的 initialObjects 抛出错误", () => {
		expect(
			() => new ContainerSchema({ initialObjects: null as any }),
		).toThrow();
	});

	it("应对空类型字符串抛出错误", () => {
		expect(
			() => new ContainerSchema({ initialObjects: { map: "" } }),
		).toThrow();
	});

	it("应正确判断动态类型是否允许", () => {
		const schema = new ContainerSchema({
			initialObjects: { map: "SharedMap" },
			dynamicObjectTypes: ["SharedString", "SharedCounter"],
		});
		expect(schema.isDynamicTypeAllowed("SharedString")).toBe(true);
		expect(schema.isDynamicTypeAllowed("SharedMap")).toBe(false);
	});

	it("无 dynamicObjectTypes 时不允许任何动态类型", () => {
		const schema = new ContainerSchema({
			initialObjects: { map: "SharedMap" },
		});
		expect(schema.isDynamicTypeAllowed("SharedString")).toBe(false);
	});

	it("应返回正确的初始对象类型", () => {
		const schema = new ContainerSchema({
			initialObjects: { map: "SharedMap" },
		});
		expect(schema.getInitialObjectType("map")).toBe("SharedMap");
		expect(schema.getInitialObjectType("unknown")).toBeUndefined();
	});

	it("toJSON 应返回接口格式", () => {
		const input = {
			initialObjects: { map: "SharedMap" },
			dynamicObjectTypes: ["SharedString"],
		};
		const schema = new ContainerSchema(input);
		const json = schema.toJSON();
		expect(json.initialObjects).toEqual(input.initialObjects);
		expect(json.dynamicObjectTypes).toEqual(input.dynamicObjectTypes);
	});

	it("应对 dynamicObjectTypes 中的空字符串抛出错误", () => {
		expect(
			() =>
				new ContainerSchema({
					initialObjects: { map: "SharedMap" },
					dynamicObjectTypes: [""],
				}),
		).toThrow();
	});
});
