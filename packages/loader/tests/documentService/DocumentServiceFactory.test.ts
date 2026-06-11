import { describe, it, expect, vi } from "vitest";
import { DocumentServiceFactory } from "../../src/documentService/DocumentServiceFactory.js";
import type { IDocumentServiceFactory } from "../../src/interfaces/IDocumentServiceFactory.js";
import type { IResolvedUrl } from "../../src/interfaces/IResolvedUrl.js";
import { ProtocolError } from "../../src/errors/ProtocolError.js";

const mockResolvedUrl: IResolvedUrl = {
	type: "fluid",
	endpoints: {
		deltaStorageUrl: "http://localhost/deltas/c1",
		ordererUrl: "http://localhost/orderer",
		storageUrl: "http://localhost/storage/c1",
	},
	id: "container-1",
	tokens: { jwt: "token123" },
	url: "fluid://localhost/container-1",
};

function createMockSubFactory(protocolName: string): IDocumentServiceFactory {
	return {
		protocolName,
		createDocumentService: vi.fn().mockResolvedValue({
			protocolName,
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
		}),
		createContainer: vi.fn().mockResolvedValue(mockResolvedUrl),
	};
}

describe("DocumentServiceFactory", () => {
	it("should delegate createDocumentService to correct sub-factory", async () => {
		const fluidFactory = createMockSubFactory("fluid");
		const ordererFactory = createMockSubFactory("orderer");
		const factory = new DocumentServiceFactory([fluidFactory, ordererFactory]);

		await factory.createDocumentService(mockResolvedUrl);

		expect(fluidFactory.createDocumentService).toHaveBeenCalledWith(
			mockResolvedUrl,
		);
		expect(ordererFactory.createDocumentService).not.toHaveBeenCalled();
	});

	it("should throw when no factory matches resolvedUrl type", async () => {
		const factory = new DocumentServiceFactory([
			createMockSubFactory("orderer"),
		]);

		await expect(
			factory.createDocumentService(mockResolvedUrl),
		).rejects.toThrow(ProtocolError);
	});

	it("should delegate createContainer to correct sub-factory", async () => {
		const fluidFactory = createMockSubFactory("fluid");
		const factory = new DocumentServiceFactory([fluidFactory]);

		await factory.createContainer({ resolvedUrl: mockResolvedUrl });

		expect(fluidFactory.createContainer).toHaveBeenCalled();
	});

	it("should expose registry for runtime additions", () => {
		const factory = new DocumentServiceFactory([]);
		const registry = factory.getRegistry();

		expect(registry.getRegisteredProtocols()).toHaveLength(0);

		registry.register(createMockSubFactory("https"));
		expect(registry.has("https")).toBe(true);
	});
});
