import { describe, it, expect, vi } from "vitest";
import { Loader } from "../../src/loader/Loader.js";
import type { IUrlResolver, IRequest } from "../../src/interfaces/IUrlResolver.js";
import type { IDocumentServiceFactory } from "../../src/interfaces/IDocumentServiceFactory.js";
import type { ICodeLoader } from "../../src/interfaces/ICodeLoader.js";
import type { IResolvedUrl } from "../../src/interfaces/IResolvedUrl.js";
import { RetryPolicy } from "../../src/retry/RetryPolicy.js";

const mockResolvedUrl: IResolvedUrl = {
	type: "fluid",
	endpoints: {
		deltaStorageUrl: "http://localhost/deltas/c1",
		ordererUrl: "http://localhost/orderer",
		storageUrl: "http://localhost/storage/c1",
	},
	id: "container-1",
	tokens: { jwt: "token" },
	url: "fluid://localhost/container-1",
};

const mockDocService = {
	protocolName: "fluid",
	connectToDeltaStorage: async () => ({ get: async () => [] }),
	connectToStorage: async () => ({
		read: async () => "",
		getSnapshotTree: async () => null,
	}),
	connectToOrderer: async () => ({
		submit: async () => {},
		disconnect: () => {},
	}),
	dispose: () => {},
};

const mockFluidModule = {
	fluidExport: {
		IRuntimeFactory: {
			type: "test",
			instantiateRuntime: async () => ({}),
		},
	},
};

function createMockUrlResolver(): IUrlResolver {
	return {
		resolve: vi.fn().mockResolvedValue(mockResolvedUrl),
		getAbsoluteUrl: vi.fn().mockResolvedValue("fluid://localhost/c1"),
	};
}

function createMockDocServiceFactory(): IDocumentServiceFactory {
	return {
		protocolName: "fluid",
		createDocumentService: vi.fn().mockResolvedValue(mockDocService),
		createContainer: vi.fn().mockResolvedValue(mockResolvedUrl),
	};
}

function createMockCodeLoader(): ICodeLoader {
	return {
		load: vi.fn().mockResolvedValue(mockFluidModule),
		preload: vi.fn().mockResolvedValue(undefined),
		evict: vi.fn().mockReturnValue(true),
	};
}

describe("Loader", () => {
	it("should resolve a container through full pipeline", async () => {
		const urlResolver = createMockUrlResolver();
		const docFactory = createMockDocServiceFactory();
		const codeLoader = createMockCodeLoader();

		const loader = new Loader({
			urlResolver,
			documentServiceFactory: docFactory,
			codeLoader,
			retryPolicy: new RetryPolicy({
				maxRetries: 1,
				baseDelayMs: 1,
				jitter: false,
			}),
		});

		const result = await loader.resolve({
			url: "fluid://localhost/container-1",
		});

		expect(result.containerId).toBe("container-1");
		expect(result.resolvedUrl).toBe(mockResolvedUrl);
		expect(result.documentService).toBe(mockDocService);
		expect(result.module).toBe(mockFluidModule);

		expect(urlResolver.resolve).toHaveBeenCalled();
		expect(docFactory.createDocumentService).toHaveBeenCalledWith(
			mockResolvedUrl,
		);
		expect(codeLoader.load).toHaveBeenCalled();
	});

	it("should create a new container", async () => {
		const urlResolver = createMockUrlResolver();
		const docFactory = createMockDocServiceFactory();
		const codeLoader = createMockCodeLoader();

		const loader = new Loader({
			urlResolver,
			documentServiceFactory: docFactory,
			codeLoader,
			retryPolicy: new RetryPolicy({
				maxRetries: 1,
				baseDelayMs: 1,
				jitter: false,
			}),
		});

		const result = await loader.createContainer({
			url: "fluid://localhost/new-container",
		});

		expect(result.containerId).toBe("container-1");
		expect(docFactory.createContainer).toHaveBeenCalled();
		expect(docFactory.createDocumentService).toHaveBeenCalled();
	});

	it("should emit events during resolve", async () => {
		const loader = new Loader({
			urlResolver: createMockUrlResolver(),
			documentServiceFactory: createMockDocServiceFactory(),
			codeLoader: createMockCodeLoader(),
			retryPolicy: new RetryPolicy({
				maxRetries: 1,
				baseDelayMs: 1,
				jitter: false,
			}),
		});

		const urlResolvedHandler = vi.fn();
		const codeLoadedHandler = vi.fn();
		const containerLoadedHandler = vi.fn();

		loader.on("urlResolved", urlResolvedHandler);
		loader.on("codeLoaded", codeLoadedHandler);
		loader.on("containerLoaded", containerLoadedHandler);

		await loader.resolve({ url: "fluid://localhost/c1" });

		expect(urlResolvedHandler).toHaveBeenCalledWith(mockResolvedUrl);
		expect(codeLoadedHandler).toHaveBeenCalled();
		expect(containerLoadedHandler).toHaveBeenCalledWith("container-1");
	});

	it("should throw when URL cannot be resolved", async () => {
		const urlResolver: IUrlResolver = {
			resolve: vi.fn().mockResolvedValue(undefined),
			getAbsoluteUrl: vi.fn(),
		};

		const loader = new Loader({
			urlResolver,
			documentServiceFactory: createMockDocServiceFactory(),
			codeLoader: createMockCodeLoader(),
			retryPolicy: new RetryPolicy({
				maxRetries: 1,
				baseDelayMs: 1,
				jitter: false,
			}),
		});

		await expect(
			loader.resolve({ url: "fluid://unknown/c1" }),
		).rejects.toThrow();
	});

	it("should use default scope manager and retry policy", async () => {
		const loader = new Loader({
			urlResolver: createMockUrlResolver(),
			documentServiceFactory: createMockDocServiceFactory(),
			codeLoader: createMockCodeLoader(),
		});

		// Should work without explicitly providing scopeManager or retryPolicy
		const result = await loader.resolve({
			url: "fluid://localhost/container-default",
		});

		expect(result.containerId).toBe("container-1");
	});

	it("should remove event listeners with off()", async () => {
		const loader = new Loader({
			urlResolver: createMockUrlResolver(),
			documentServiceFactory: createMockDocServiceFactory(),
			codeLoader: createMockCodeLoader(),
			retryPolicy: new RetryPolicy({
				maxRetries: 1,
				baseDelayMs: 1,
				jitter: false,
			}),
		});

		const handler = vi.fn();
		loader.on("containerLoaded", handler);
		loader.off("containerLoaded", handler);

		await loader.resolve({ url: "fluid://localhost/c1" });

		expect(handler).not.toHaveBeenCalled();
	});
});
