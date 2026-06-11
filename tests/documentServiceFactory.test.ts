import { FluidDocumentServiceFactory } from "../src/documentServiceFactory";
import { UnsupportedProtocolError, DocumentServiceError } from "../src/errors";
import type { IFluidResolvedUrl } from "../src/types";

function makeResolvedUrl(overrides: Partial<IFluidResolvedUrl> = {}): IFluidResolvedUrl {
  return {
    containerId: "test-container",
    serviceEndpoint: "fluid://localhost",
    protocol: "fluid",
    host: "localhost",
    credentials: {},
    queryString: {},
    originalUrl: "fluid://localhost/test-container",
    ...overrides,
  };
}

describe("FluidDocumentServiceFactory", () => {
  let factory: FluidDocumentServiceFactory;

  beforeEach(() => {
    factory = new FluidDocumentServiceFactory();
  });

  describe("default protocols", () => {
    it("should have fluid, https, and http registered by default", () => {
      expect(factory.hasProtocol("fluid")).toBe(true);
      expect(factory.hasProtocol("https")).toBe(true);
      expect(factory.hasProtocol("http")).toBe(true);
    });

    it("should create document service for fluid protocol", async () => {
      const service = await factory.createDocumentService(makeResolvedUrl());
      expect(service).toBeDefined();
      expect(typeof service.connectToContainer).toBe("function");
      expect(typeof service.connectToStorage).toBe("function");
      expect(typeof service.connectToDeltaStream).toBe("function");
    });

    it("should create document service for https protocol", async () => {
      const service = await factory.createDocumentService(
        makeResolvedUrl({ protocol: "https" }),
      );
      expect(service).toBeDefined();
    });
  });

  describe("registerProtocol", () => {
    it("should register a custom protocol", () => {
      factory.registerProtocol("custom", async () => ({
        connectToContainer: async () => ({
          containerId: "c",
          close: () => {},
          on: () => {},
        }),
        connectToStorage: async () => ({
          getSnapshot: async () => ({}),
          createBlob: async () => "b",
          getBlob: async () => ({}),
        }),
        connectToDeltaStream: async () => ({
          submit: () => {},
          on: () => {},
          disconnect: () => {},
        }),
        dispose: () => {},
      }));

      expect(factory.hasProtocol("custom")).toBe(true);
    });

    it("should be case-insensitive", () => {
      factory.registerProtocol("MyProtocol", async () => ({
        connectToContainer: async () => ({
          containerId: "c",
          close: () => {},
          on: () => {},
        }),
        connectToStorage: async () => ({
          getSnapshot: async () => ({}),
          createBlob: async () => "b",
          getBlob: async () => ({}),
        }),
        connectToDeltaStream: async () => ({
          submit: () => {},
          on: () => {},
          disconnect: () => {},
        }),
        dispose: () => {},
      }));

      expect(factory.hasProtocol("myprotocol")).toBe(true);
    });
  });

  describe("createDocumentService", () => {
    it("should throw UnsupportedProtocolError for unknown protocol", async () => {
      await expect(
        factory.createDocumentService(
          makeResolvedUrl({ protocol: "unknown" }),
        ),
      ).rejects.toThrow(UnsupportedProtocolError);
    });

    it("should throw DocumentServiceError when factory function fails", async () => {
      factory.registerProtocol("broken", async () => {
        throw new Error("internal failure");
      });

      await expect(
        factory.createDocumentService(
          makeResolvedUrl({ protocol: "broken" }),
        ),
      ).rejects.toThrow(DocumentServiceError);
    });
  });

  describe("document service connections", () => {
    it("should connect to container", async () => {
      const service = await factory.createDocumentService(makeResolvedUrl());
      const conn = await service.connectToContainer();
      expect(conn.containerId).toBe("test-container");
      conn.close(); // should not throw
    });

    it("should connect to storage", async () => {
      const service = await factory.createDocumentService(makeResolvedUrl());
      const storage = await service.connectToStorage();
      const snapshot = await storage.getSnapshot();
      expect(snapshot).toBeDefined();
    });

    it("should connect to delta stream", async () => {
      const service = await factory.createDocumentService(makeResolvedUrl());
      const delta = await service.connectToDeltaStream();
      delta.submit({ type: "op" }); // should not throw
      delta.disconnect(); // should not throw
    });

    it("should throw after dispose", async () => {
      const service = await factory.createDocumentService(makeResolvedUrl());
      service.dispose();
      await expect(service.connectToContainer()).rejects.toThrow(DocumentServiceError);
    });
  });

  describe("getSupportedProtocols", () => {
    it("should return list of registered protocols", () => {
      const protocols = factory.getSupportedProtocols();
      expect(protocols).toContain("fluid");
      expect(protocols).toContain("https");
      expect(protocols).toContain("http");
    });
  });
});
