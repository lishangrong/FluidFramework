import { describe, it, expect, vi } from "vitest";
import { CodeLoader } from "../../src/codeLoader/CodeLoader.js";
import { CodeLoadError } from "../../src/errors/CodeLoadError.js";
import type { IFluidCodeDetails } from "../../src/interfaces/IFluidCodeDetails.js";

const validModule = {
	fluidExport: {
		IRuntimeFactory: {
			type: "test-runtime",
			instantiateRuntime: async () => ({}),
		},
	},
};

const codeDetails: IFluidCodeDetails = {
	package: "test-pkg",
	version: "1.0.0",
	entryPoint: "./test-entry",
};

describe("CodeLoader", () => {
	it("should load module via moduleLoader", async () => {
		const mockLoader = vi.fn().mockResolvedValue(validModule);
		const loader = new CodeLoader({ moduleLoader: mockLoader });

		const result = await loader.load(codeDetails);

		expect(result).toEqual(validModule);
		expect(mockLoader).toHaveBeenCalledWith("./test-entry");
	});

	it("should return cached module on second load", async () => {
		const mockLoader = vi.fn().mockResolvedValue(validModule);
		const loader = new CodeLoader({ moduleLoader: mockLoader });

		await loader.load(codeDetails);
		const result = await loader.load(codeDetails);

		expect(result).toEqual(validModule);
		expect(mockLoader).toHaveBeenCalledTimes(1);
	});

	it("should deduplicate concurrent loads", async () => {
		const mockLoader = vi.fn().mockImplementation(
			() => new Promise((resolve) => setTimeout(() => resolve(validModule), 10)),
		);
		const loader = new CodeLoader({ moduleLoader: mockLoader });

		const [r1, r2] = await Promise.all([
			loader.load(codeDetails),
			loader.load(codeDetails),
		]);

		expect(r1).toEqual(validModule);
		expect(r2).toEqual(validModule);
		expect(mockLoader).toHaveBeenCalledTimes(1);
	});

	it("should throw CodeLoadError on fetch failure", async () => {
		const mockLoader = vi
			.fn()
			.mockRejectedValue(new Error("network error"));
		const loader = new CodeLoader({ moduleLoader: mockLoader });

		await expect(loader.load(codeDetails)).rejects.toThrow(CodeLoadError);
	});

	it("should throw CodeLoadError on invalid module shape", async () => {
		const mockLoader = vi.fn().mockResolvedValue({ invalid: true });
		const loader = new CodeLoader({ moduleLoader: mockLoader });

		await expect(loader.load(codeDetails)).rejects.toThrow(CodeLoadError);
	});

	it("should use package name as entryPoint when entryPoint is missing", async () => {
		const mockLoader = vi.fn().mockResolvedValue(validModule);
		const loader = new CodeLoader({ moduleLoader: mockLoader });

		await loader.load({ package: "my-pkg", version: "1.0.0" });

		expect(mockLoader).toHaveBeenCalledWith("my-pkg");
	});

	it("should evict cached module", async () => {
		const mockLoader = vi.fn().mockResolvedValue(validModule);
		const loader = new CodeLoader({ moduleLoader: mockLoader });

		await loader.load(codeDetails);
		const evicted = loader.evict("test-pkg@1.0.0");

		expect(evicted).toBe(true);
		// Loading again should re-fetch
		await loader.load(codeDetails);
		expect(mockLoader).toHaveBeenCalledTimes(2);
	});

	it("should preload module into cache", async () => {
		const mockLoader = vi.fn().mockResolvedValue(validModule);
		const loader = new CodeLoader({ moduleLoader: mockLoader });

		await loader.preload(codeDetails);
		// Second load should be from cache
		await loader.load(codeDetails);

		expect(mockLoader).toHaveBeenCalledTimes(1);
	});
});
