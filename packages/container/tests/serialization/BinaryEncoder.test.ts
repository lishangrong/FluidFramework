import { describe, it, expect } from "vitest";
import { BinaryEncoder } from "../../src/serialization/BinaryEncoder.js";
import { BinaryDecoder } from "../../src/serialization/BinaryDecoder.js";

describe("BinaryEncoder", () => {
	it("应编码 null", () => {
		const encoder = new BinaryEncoder();
		encoder.writeNull();
		const data = encoder.toUint8Array();
		expect(data.length).toBe(1);
		expect(data[0]).toBe(0x00);
	});

	it("应编码布尔值", () => {
		const encoder = new BinaryEncoder();
		encoder.writeBool(true);
		encoder.writeBool(false);
		const data = encoder.toUint8Array();
		expect(data[0]).toBe(0x02); // True
		expect(data[1]).toBe(0x01); // False
	});

	it("应编码 32 位整数", () => {
		const encoder = new BinaryEncoder();
		encoder.writeInt32(42);
		const data = encoder.toUint8Array();
		expect(data.length).toBe(5);
		expect(data[0]).toBe(0x10);
	});

	it("应编码 64 位浮点数", () => {
		const encoder = new BinaryEncoder();
		encoder.writeFloat64(3.14);
		const data = encoder.toUint8Array();
		expect(data.length).toBe(9);
		expect(data[0]).toBe(0x11);
	});

	it("应编码字符串", () => {
		const encoder = new BinaryEncoder();
		encoder.writeString("hello");
		const data = encoder.toUint8Array();
		expect(data[0]).toBe(0x20);
		expect(data.length).toBe(1 + 4 + 5); // tag + length + "hello"
	});

	it("应编码空字符串", () => {
		const encoder = new BinaryEncoder();
		encoder.writeString("");
		const data = encoder.toUint8Array();
		expect(data[0]).toBe(0x20);
		expect(data.length).toBe(5); // tag + 4-byte zero length
	});

	it("应编码二进制数据", () => {
		const encoder = new BinaryEncoder();
		const bytes = new Uint8Array([1, 2, 3]);
		encoder.writeBytes(bytes);
		const data = encoder.toUint8Array();
		expect(data[0]).toBe(0x30);
	});

	it("应编码数组", () => {
		const encoder = new BinaryEncoder();
		encoder.writeArray([1, "two", null]);
		const data = encoder.toUint8Array();
		expect(data[0]).toBe(0x40);
	});

	it("应编码对象", () => {
		const encoder = new BinaryEncoder();
		encoder.writeMap({ key: "value" });
		const data = encoder.toUint8Array();
		expect(data[0]).toBe(0x50);
	});

	it("应自动扩容处理大数据", () => {
		const encoder = new BinaryEncoder(8); // 小初始容量
		const longStr = "x".repeat(1000);
		encoder.writeString(longStr);
		const decoder = new BinaryDecoder(encoder.toUint8Array());
		expect(decoder.readValue()).toBe(longStr);
	});

	it("writeValue 应自动分发类型", () => {
		const encoder = new BinaryEncoder();
		encoder.writeValue(null);
		encoder.writeValue(true);
		encoder.writeValue(42);
		encoder.writeValue(3.14);
		encoder.writeValue("hello");
		encoder.writeValue([1, 2]);
		encoder.writeValue({ a: 1 });
		expect(encoder.byteLength).toBeGreaterThan(0);
	});

	it("应对不支持的类型抛出错误", () => {
		const encoder = new BinaryEncoder();
		expect(() => encoder.writeValue(Symbol("test"))).toThrow();
	});

	it("应正确编码负整数", () => {
		const encoder = new BinaryEncoder();
		encoder.writeInt32(-100);
		const decoder = new BinaryDecoder(encoder.toUint8Array());
		expect(decoder.readValue()).toBe(-100);
	});

	it("应编码中文字符串", () => {
		const encoder = new BinaryEncoder();
		encoder.writeString("你好世界");
		const decoder = new BinaryDecoder(encoder.toUint8Array());
		expect(decoder.readValue()).toBe("你好世界");
	});
});
