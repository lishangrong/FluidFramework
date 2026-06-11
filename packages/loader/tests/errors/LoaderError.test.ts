import { describe, it, expect } from "vitest";
import { LoaderError } from "../../src/errors/LoaderError.js";
import { LoaderErrorCode } from "../../src/errors/LoaderErrorCode.js";
import { ProtocolError } from "../../src/errors/ProtocolError.js";
import { CodeLoadError } from "../../src/errors/CodeLoadError.js";
import { UrlResolveError } from "../../src/errors/UrlResolveError.js";

describe("LoaderError", () => {
	it("should create with correct properties", () => {
		const error = new LoaderError(
			"test error",
			LoaderErrorCode.InvalidUrl,
			{ key: "value" },
		);

		expect(error.message).toBe("test error");
		expect(error.errorCode).toBe(LoaderErrorCode.InvalidUrl);
		expect(error.context).toEqual({ key: "value" });
		expect(error.timestamp).toBeLessThanOrEqual(Date.now());
		expect(error.name).toBe("LoaderError");
		expect(error.retryable).toBe(false);
	});

	it("should chain cause error", () => {
		const cause = new Error("root cause");
		const error = new LoaderError(
			"wrapper",
			LoaderErrorCode.CodeLoadFailed,
			undefined,
			cause,
		);

		expect(error.cause).toBe(cause);
	});

	it("should be instanceof Error", () => {
		const error = new LoaderError("test", LoaderErrorCode.InvalidUrl);
		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(LoaderError);
	});
});

describe("ProtocolError", () => {
	it("should never be retryable", () => {
		const error = new ProtocolError(
			"not registered",
			LoaderErrorCode.ProtocolNotRegistered,
		);

		expect(error.retryable).toBe(false);
		expect(error.name).toBe("ProtocolError");
		expect(error).toBeInstanceOf(LoaderError);
	});
});

describe("CodeLoadError", () => {
	it("should be retryable for CodeLoadFailed", () => {
		const error = new CodeLoadError(
			"network error",
			LoaderErrorCode.CodeLoadFailed,
		);
		expect(error.retryable).toBe(true);
	});

	it("should be retryable for ModuleNotFound", () => {
		const error = new CodeLoadError(
			"not found",
			LoaderErrorCode.ModuleNotFound,
		);
		expect(error.retryable).toBe(true);
	});

	it("should not be retryable for InvalidModule", () => {
		const error = new CodeLoadError(
			"invalid",
			LoaderErrorCode.InvalidModule,
		);
		expect(error.retryable).toBe(false);
	});

	it("should not be retryable for ModuleValidationFailed", () => {
		const error = new CodeLoadError(
			"validation failed",
			LoaderErrorCode.ModuleValidationFailed,
		);
		expect(error.retryable).toBe(false);
	});
});

describe("UrlResolveError", () => {
	it("should be retryable for UrlResolveFailed", () => {
		const error = new UrlResolveError(
			"resolve failed",
			LoaderErrorCode.UrlResolveFailed,
		);
		expect(error.retryable).toBe(true);
	});

	it("should not be retryable for InvalidUrl", () => {
		const error = new UrlResolveError(
			"bad url",
			LoaderErrorCode.InvalidUrl,
		);
		expect(error.retryable).toBe(false);
	});

	it("should not be retryable for MissingContainerId", () => {
		const error = new UrlResolveError(
			"no container",
			LoaderErrorCode.MissingContainerId,
		);
		expect(error.retryable).toBe(false);
	});
});
