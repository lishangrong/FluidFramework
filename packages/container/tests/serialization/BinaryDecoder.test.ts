import { describe, it, expect } from "vitest";
import { BinaryEncoder } from "../../src/serialization/BinaryEncoder.js";
import { BinaryDecoder } from "../../src/serialization/BinaryDecoder.js";

describe("BinaryDecoder", () => {
	it("应解码 null", () => {
		const encoder = new BinaryEncoder();
		encoder.writeNull();
		const decoder = new BinaryDecoder(encoder.toUint8Array());
		expect(decoder.readValue()).toBeNull();
	});

	it("应解码布尔值", () => {
		const encoder = new BinaryEncoder();
		encoder.writeBool(true);
		encoder.writeBool(false);
		const decoder = new BinaryDecoder(encoder.toUint8Array());
		expect(decoder.readValue()).toBe(true);
		expect(decoder.readValue()).toBe(false);
	});

	it("应解码整数", () => {
		const encoder = new BinaryEncoder();
		encoder.writeInt32(12345);
		const decoder = new BinaryDecoder(encoder.toUint8Array());
		expect(decoder.readValue()).toBe(12345);
	});

	it("应解码浮点数", () => {
		const encoder = new BinaryEncoder();
		encoder.writeFloat64(3.14159);
		const decoder = new BinaryDecoder(encoder.toUint8Array());
		expect(decoder.readValue()).toBeCloseTo(3.14159);
	});

	it("应解码字符串", () => {
		const encoder = new BinaryEncoder();
		encoder.writeString("test string");
		const decoder = new BinaryDecoder(encoder.toUint8Array());
		expect(decoder.readValue()).toBe("test string");
	});

	it("应解码二进制数据", () => {
		const encoder = new BinaryEncoder();
		const original = new Uint8Array([10, 20, 30]);
		encoder.writeBytes(original);
		const decoder = new BinaryDecoder(encoder.toUint8Array());
		const decoded = decoder.readValue() as Uint8Array;
		expect(decoded).toEqual(original);
	});

	it("应解码数组", () => {
		const encoder = new BinaryEncoder();
		encoder.writeArray([1, "two", null, true]);
		const decoder = new BinaryDecoder(encoder.toUint8Array());
		expect(decoder.readValue()).toEqual([1, "two", null, true]);
	});

	it("应解码对象", () => {
		const encoder = new BinaryEncoder();
		encoder.writeMap({ name: "test", count: 42, active: true });
		const decoder = new BinaryDecoder(encoder.toUint8Array());
		expect(decoder.readValue()).toEqual({ name: "test", count: 42, active: true });
	});

	it("应解码嵌套结构", () => {
		const encoder = new BinaryEncoder();
		const nested = { arr: [1, { inner: "value" }], flag: false };
		encoder.writeValue(nested);
		const decoder = new BinaryDecoder(encoder.toUint8Array());
		expect(decoder.readValue()).toEqual(nested);
	});

	it("应正确报告 hasMore 状态", () => {
		const encoder = new BinaryEncoder();
		encoder.writeInt32(1);
		encoder.writeInt32(2);
		const decoder = new BinaryDecoder(encoder.toUint8Array());
		expect(decoder.hasMore).toBe(true);
		decoder.readValue();
		expect(decoder.hasMore).toBe(true);
		decoder.readValue();
		expect(decoder.hasMore).toBe(false);
	});

	it("数据不足时应抛出错误", () => {
		const data = new Uint8Array([0x10, 0x00]); // Int32 标签但只有1字节数据
		const decoder = new BinaryDecoder(data);
		expect(() => decoder.readValue()).toThrow();
	});

	it("未知标签应抛出错误", () => {
		const data = new Uint8Array([0xFF]);
		const decoder = new BinaryDecoder(data);
		expect(() => decoder.readValue()).toThrow();
	});
});
