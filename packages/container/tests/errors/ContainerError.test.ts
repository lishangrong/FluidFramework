import { describe, it, expect } from "vitest";
import { ContainerError } from "../../src/errors/ContainerError.js";
import { ContainerErrorCode } from "../../src/errors/ContainerErrorCode.js";
import { SchemaError } from "../../src/errors/SchemaError.js";
import { DdsError } from "../../src/errors/DdsError.js";
import { SnapshotError } from "../../src/errors/SnapshotError.js";
import { SerializationError } from "../../src/errors/SerializationError.js";

describe("ContainerError", () => {
	it("应正确设置错误属性", () => {
		const error = new ContainerError(
			"测试错误",
			ContainerErrorCode.ContainerDisposed,
			{ key: "value" },
		);
		expect(error.message).toBe("测试错误");
		expect(error.errorCode).toBe(ContainerErrorCode.ContainerDisposed);
		expect(error.context).toEqual({ key: "value" });
		expect(error.timestamp).toBeGreaterThan(0);
		expect(error.name).toBe("ContainerError");
		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(ContainerError);
	});

	it("默认不可重试", () => {
		const error = new ContainerError("test", ContainerErrorCode.ContainerDisposed);
		expect(error.retryable).toBe(false);
	});

	it("应支持错误链", () => {
		const cause = new Error("原始错误");
		const error = new ContainerError(
			"包装错误",
			ContainerErrorCode.ConnectionFailed,
			undefined,
			cause,
		);
		expect(error.cause).toBe(cause);
	});
});

describe("SchemaError", () => {
	it("始终不可重试", () => {
		const error = new SchemaError("schema错误", ContainerErrorCode.InvalidSchema);
		expect(error.retryable).toBe(false);
		expect(error.name).toBe("SchemaError");
		expect(error).toBeInstanceOf(ContainerError);
	});
});

describe("DdsError", () => {
	it("DdsOperationFailed 应可重试", () => {
		const error = new DdsError("操作失败", ContainerErrorCode.DdsOperationFailed);
		expect(error.retryable).toBe(true);
	});

	it("DdsNotFound 不可重试", () => {
		const error = new DdsError("未找到", ContainerErrorCode.DdsNotFound);
		expect(error.retryable).toBe(false);
	});

	it("DdsDisposed 不可重试", () => {
		const error = new DdsError("已销毁", ContainerErrorCode.DdsDisposed);
		expect(error.retryable).toBe(false);
	});
});

describe("SnapshotError", () => {
	it("SnapshotFailed 应可重试", () => {
		const error = new SnapshotError("快照失败", ContainerErrorCode.SnapshotFailed);
		expect(error.retryable).toBe(true);
	});

	it("SnapshotCorrupted 不可重试", () => {
		const error = new SnapshotError("数据损坏", ContainerErrorCode.SnapshotCorrupted);
		expect(error.retryable).toBe(false);
	});

	it("SnapshotRestoreFailed 不可重试", () => {
		const error = new SnapshotError("恢复失败", ContainerErrorCode.SnapshotRestoreFailed);
		expect(error.retryable).toBe(false);
	});
});

describe("SerializationError", () => {
	it("始终不可重试", () => {
		const error = new SerializationError("编码失败", ContainerErrorCode.EncodeFailed);
		expect(error.retryable).toBe(false);
		expect(error.name).toBe("SerializationError");
	});

	it("DecodeFailed 不可重试", () => {
		const error = new SerializationError("解码失败", ContainerErrorCode.DecodeFailed);
		expect(error.retryable).toBe(false);
	});
});
