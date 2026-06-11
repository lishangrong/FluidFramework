import { describe, it, expect } from "vitest";
import { DocumentServiceFactoryRegistry } from "../../src/documentService/DocumentServiceFactoryRegistry.js";
import { ProtocolError } from "../../src/errors/ProtocolError.js";
import type { IDocumentServiceFactory } from "../../src/interfaces/IDocumentServiceFactory.js";

function createMockFactory(
	protocolName: string,
): IDocumentServiceFactory {
	return {
		protocolName,
		createDocumentService: async () => ({
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
		createContainer: async (params) => params.resolvedUrl,
	};
}

describe("DocumentServiceFactoryRegistry", () => {
	it("should register and retrieve factory", () => {
		const registry = new DocumentServiceFactoryRegistry();
		const factory = createMockFactory("fluid");
		registry.register(factory);

		expect(registry.get("fluid")).toBe(factory);
		expect(registry.has("fluid")).toBe(true);
	});

	it("should accept factories via constructor", () => {
		const f1 = createMockFactory("fluid");
		const f2 = createMockFactory("orderer");
		const registry = new DocumentServiceFactoryRegistry([f1, f2]);

		expect(registry.has("fluid")).toBe(true);
		expect(registry.has("orderer")).toBe(true);
	});

	it("should throw on duplicate protocol registration", () => {
		const registry = new DocumentServiceFactoryRegistry();
		registry.register(createMockFactory("fluid"));

		expect(() => registry.register(createMockFactory("fluid"))).toThrow(
			ProtocolError,
		);
	});

	it("should throw on getting unregistered protocol", () => {
		const registry = new DocumentServiceFactoryRegistry();

		expect(() => registry.get("unknown")).toThrow(ProtocolError);
	});

	it("should return undefined for tryGet of unregistered protocol", () => {
		const registry = new DocumentServiceFactoryRegistry();

		expect(registry.tryGet("unknown")).toBeUndefined();
	});

	it("should unregister factory", () => {
		const registry = new DocumentServiceFactoryRegistry();
		registry.register(createMockFactory("fluid"));

		expect(registry.unregister("fluid")).toBe(true);
		expect(registry.has("fluid")).toBe(false);
		expect(registry.unregister("fluid")).toBe(false);
	});

	it("should list registered protocols", () => {
		const registry = new DocumentServiceFactoryRegistry([
			createMockFactory("fluid"),
			createMockFactory("orderer"),
		]);

		const protocols = registry.getRegisteredProtocols();
		expect(protocols).toContain("fluid");
		expect(protocols).toContain("orderer");
		expect(protocols).toHaveLength(2);
	});
});
