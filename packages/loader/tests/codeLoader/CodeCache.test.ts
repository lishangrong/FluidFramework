import { describe, it, expect } from "vitest";
import { CodeCache } from "../../src/codeLoader/CodeCache.js";
import type { IFluidModule } from "../../src/interfaces/IFluidModule.js";

function createMockModule(type: string): IFluidModule {
	return {
		fluidExport: {
			IRuntimeFactory: {
				type,
				instantiateRuntime: async () => ({}),
			},
		},
	};
}

describe("CodeCache", () => {
	it("should return undefined for cache miss", () => {
		const cache = new CodeCache();
		expect(cache.get("nonexistent@1.0.0")).toBeUndefined();
	});

	it("should store and retrieve module", () => {
		const cache = new CodeCache();
		const module = createMockModule("test");
		cache.set("pkg@1.0.0", module);

		expect(cache.get("pkg@1.0.0")).toBe(module);
		expect(cache.has("pkg@1.0.0")).toBe(true);
		expect(cache.size).toBe(1);
	});

	it("should evict LRU entry when maxSize reached", () => {
		const cache = new CodeCache(2);
		const m1 = createMockModule("m1");
		const m2 = createMockModule("m2");
		const m3 = createMockModule("m3");

		cache.set("a@1.0", m1);
		cache.set("b@1.0", m2);

		// Access a to make b the LRU
		cache.get("a@1.0");

		cache.set("c@1.0", m3);

		expect(cache.has("a@1.0")).toBe(true);
		expect(cache.has("b@1.0")).toBe(false); // evicted
		expect(cache.has("c@1.0")).toBe(true);
		expect(cache.size).toBe(2);
	});

	it("should delete specific entry", () => {
		const cache = new CodeCache();
		cache.set("pkg@1.0", createMockModule("test"));

		expect(cache.delete("pkg@1.0")).toBe(true);
		expect(cache.has("pkg@1.0")).toBe(false);
		expect(cache.delete("pkg@1.0")).toBe(false);
	});

	it("should clear all entries", () => {
		const cache = new CodeCache();
		cache.set("a@1.0", createMockModule("a"));
		cache.set("b@1.0", createMockModule("b"));

		cache.clear();
		expect(cache.size).toBe(0);
	});

	it("should build correct cache key", () => {
		expect(CodeCache.buildKey("@scope/pkg", "2.0.0")).toBe(
			"@scope/pkg@2.0.0",
		);
	});
});
