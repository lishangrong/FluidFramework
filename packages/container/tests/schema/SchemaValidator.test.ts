import { describe, it, expect } from "vitest";
import { ContainerSchema } from "../../src/schema/ContainerSchema.js";
import { SchemaValidator } from "../../src/schema/SchemaValidator.js";

describe("SchemaValidator", () => {
	const registeredTypes = new Set(["SharedMap", "SharedString", "SharedCounter"]);

	it("有效 schema 应通过验证", () => {
		const schema = new ContainerSchema({
			initialObjects: { map: "SharedMap" },
			dynamicObjectTypes: ["SharedString"],
		});
		expect(() => SchemaValidator.validate(schema, registeredTypes)).not.toThrow();
	});

	it("初始对象使用未注册类型应抛出错误", () => {
		const schema = new ContainerSchema({
			initialObjects: { custom: "CustomType" },
		});
		expect(() => SchemaValidator.validate(schema, registeredTypes)).toThrow("未注册");
	});

	it("动态对象使用未注册类型应抛出错误", () => {
		const schema = new ContainerSchema({
			initialObjects: { map: "SharedMap" },
			dynamicObjectTypes: ["UnknownType"],
		});
		expect(() => SchemaValidator.validate(schema, registeredTypes)).toThrow("未注册");
	});

	it("所有类型都已注册时应通过验证", () => {
		const schema = new ContainerSchema({
			initialObjects: { map: "SharedMap", str: "SharedString", cnt: "SharedCounter" },
			dynamicObjectTypes: ["SharedMap", "SharedString", "SharedCounter"],
		});
		expect(() => SchemaValidator.validate(schema, registeredTypes)).not.toThrow();
	});
});
