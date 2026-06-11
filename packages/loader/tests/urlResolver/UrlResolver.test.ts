import { describe, it, expect } from "vitest";
import { UrlResolver } from "../../src/urlResolver/UrlResolver.js";

describe("UrlResolver", () => {
	describe("resolve", () => {
		it("should resolve a valid fluid:// URL", async () => {
			const resolver = new UrlResolver();
			const result = await resolver.resolve({
				url: "fluid://myhost.com/container-1?token=jwt-abc",
			});

			expect(result).toBeDefined();
			expect(result!.type).toBe("fluid");
			expect(result!.id).toBe("container-1");
			expect(result!.tokens.jwt).toBe("jwt-abc");
			expect(result!.endpoints.deltaStorageUrl).toContain("container-1");
			expect(result!.endpoints.ordererUrl).toContain("myhost.com");
			expect(result!.endpoints.storageUrl).toContain("container-1");
		});

		it("should return undefined for non-Fluid URL", async () => {
			const resolver = new UrlResolver();
			const result = await resolver.resolve({
				url: "ftp://host/path",
			});

			expect(result).toBeUndefined();
		});

		it("should apply endpoint overrides", async () => {
			const resolver = new UrlResolver({
				endpointOverrides: {
					ordererUrl: "https://custom-orderer.com",
				},
			});

			const result = await resolver.resolve({
				url: "fluid://host/c1",
			});

			expect(result!.endpoints.ordererUrl).toBe(
				"https://custom-orderer.com",
			);
			// Other endpoints should still be auto-generated
			expect(result!.endpoints.deltaStorageUrl).toContain("host");
		});

		it("should resolve orderer:// URL", async () => {
			const resolver = new UrlResolver();
			const result = await resolver.resolve({
				url: "orderer://orderer-host/c2",
			});

			expect(result).toBeDefined();
			expect(result!.type).toBe("orderer");
			expect(result!.id).toBe("c2");
		});
	});

	describe("getAbsoluteUrl", () => {
		it("should generate absolute URL with container ID", async () => {
			const resolver = new UrlResolver();
			const resolved = await resolver.resolve({
				url: "fluid://host/c1",
			});

			const url = await resolver.getAbsoluteUrl(resolved!, "");
			expect(url).toContain("c1");
		});

		it("should generate absolute URL with relative path", async () => {
			const resolver = new UrlResolver();
			const resolved = await resolver.resolve({
				url: "fluid://host/c1",
			});

			const url = await resolver.getAbsoluteUrl(
				resolved!,
				"subpath/data",
			);
			expect(url).toContain("subpath/data");
		});
	});
});
