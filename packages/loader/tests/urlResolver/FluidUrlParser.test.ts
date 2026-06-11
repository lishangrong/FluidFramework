import { describe, it, expect } from "vitest";
import { FluidUrlParser } from "../../src/urlResolver/FluidUrlParser.js";
import { UrlResolveError } from "../../src/errors/UrlResolveError.js";

describe("FluidUrlParser", () => {
	describe("parse", () => {
		it("should parse fluid:// URL", () => {
			const result = FluidUrlParser.parse(
				"fluid://myhost.com/container-123?token=jwt-abc",
			);

			expect(result.protocol).toBe("fluid:");
			expect(result.host).toBe("myhost.com");
			expect(result.containerId).toBe("container-123");
			expect(result.tokens.jwt).toBe("jwt-abc");
		});

		it("should parse https:// URL with /fluid/ prefix", () => {
			const result = FluidUrlParser.parse(
				"https://myhost.com/fluid/container-456",
			);

			expect(result.protocol).toBe("https:");
			expect(result.host).toBe("myhost.com");
			expect(result.containerId).toBe("container-456");
		});

		it("should parse orderer:// URL", () => {
			const result = FluidUrlParser.parse(
				"orderer://orderer-host.com/container-789",
			);

			expect(result.protocol).toBe("orderer:");
			expect(result.host).toBe("orderer-host.com");
			expect(result.containerId).toBe("container-789");
		});

		it("should extract storageToken from query", () => {
			const result = FluidUrlParser.parse(
				"fluid://host/c1?storageToken=st-123",
			);

			expect(result.tokens.storageToken).toBe("st-123");
		});

		it("should throw on invalid URL format", () => {
			expect(() => FluidUrlParser.parse("not-a-url")).toThrow(
				UrlResolveError,
			);
		});

		it("should throw on unsupported protocol", () => {
			expect(() => FluidUrlParser.parse("ftp://host/c1")).toThrow(
				UrlResolveError,
			);
		});

		it("should throw on missing container ID", () => {
			expect(() => FluidUrlParser.parse("fluid://host/")).toThrow(
				UrlResolveError,
			);
		});

		it("should extract query params", () => {
			const result = FluidUrlParser.parse(
				"fluid://host/c1?foo=bar&baz=qux",
			);

			expect(result.query).toEqual({ foo: "bar", baz: "qux" });
		});
	});

	describe("isFluidUrl", () => {
		it("should return true for fluid:// URL", () => {
			expect(FluidUrlParser.isFluidUrl("fluid://host/c1")).toBe(true);
		});

		it("should return true for https:// URL", () => {
			expect(FluidUrlParser.isFluidUrl("https://host/c1")).toBe(true);
		});

		it("should return true for orderer:// URL", () => {
			expect(FluidUrlParser.isFluidUrl("orderer://host/c1")).toBe(true);
		});

		it("should return false for unsupported protocol", () => {
			expect(FluidUrlParser.isFluidUrl("ftp://host/c1")).toBe(false);
		});

		it("should return false for invalid URL", () => {
			expect(FluidUrlParser.isFluidUrl("not-a-url")).toBe(false);
		});
	});
});
