import { describe, it, expect } from "vitest";
import { BinarySerializer } from "../../src/serialization/BinarySerializer.js";

describe("BinarySerializer", () => {
	const serializer = new BinarySerializer();

	it("应对 null 进行往返编解码", () => {
		const encoded = serializer.encode(null);
		expect(serializer.decode(encoded)).toBeNull();
	});

	it("应对布尔值进行往返编解码", () => {
		expect(serializer.decode(serializer.encode(true))).toBe(true);
		expect(serializer.decode(serializer.encode(false))).toBe(false);
	});

	it("应对整数进行往返编解码", () => {
		expect(serializer.decode(serializer.encode(0))).toBe(0);
		expect(serializer.decode(serializer.encode(-1))).toBe(-1);
		expect(serializer.decode(serializer.encode(2147483647))).toBe(2147483647);
	});

	it("应对浮点数进行往返编解码", () => {
		const result = serializer.decode(serializer.encode(3.14));
		expect(result).toBeCloseTo(3.14);
	});

	it("应对字符串进行往返编解码", () => {
		expect(serializer.decode(serializer.encode(""))).toBe("");
		expect(serializer.decode(serializer.encode("hello"))).toBe("hello");
		expect(serializer.decode(serializer.encode("中文测试"))).toBe("中文测试");
	});

	it("应对复杂对象进行往返编解码", () => {
		const obj = {
			name: "test",
			values: [1, 2, 3],
			nested: { flag: true, data: null },
		};
		expect(serializer.decode(serializer.encode(obj))).toEqual(obj);
	});

	it("应对空数组进行往返编解码", () => {
		expect(serializer.decode(serializer.encode([]))).toEqual([]);
	});

	it("应对空对象进行往返编解码", () => {
		expect(serializer.decode(serializer.encode({}))).toEqual({});
	});
});
