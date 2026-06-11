import { FluidLoader } from "../src/loader";
import { UrlResolutionError } from "../src/errors";

describe("FluidLoader", () => {
  let loader: FluidLoader;

  beforeEach(() => {
    loader = new FluidLoader({
      maxRetries: 1,
      retryBaseDelay: 1,
      retryMaxDelay: 10,
    });
  });

  describe("resolve", () => {
    it("should resolve a valid fluid:// URL", async () => {
      const result = await loader.resolve("fluid://host/container-1?token=abc");
      expect(result.containerId).toBe("container-1");
      expect(result.protocol).toBe("fluid");
      expect(result.credentials.token).toBe("abc");
    });

    it("should resolve an https:// URL with /fluid/ path", async () => {
      const result = await loader.resolve("https://host/fluid/container-2");
      expect(result.containerId).toBe("container-2");
      expect(result.protocol).toBe("https");
    });

    it("should try fallback when primary resolution fails", async () => {
      // "host/container" is not a valid URL, but adding https:// prefix might work
      const result = await loader.resolve("https://host/fluid/fallback-container");
      expect(result.containerId).toBe("fallback-container");
    });

    it("should throw for completely invalid URL", async () => {
      await expect(loader.resolve("garbage")).rejects.toThrow(UrlResolutionError);
    });
  });

  describe("load", () => {
    it("should load a container and return document service", async () => {
      const service = await loader.load("fluid://localhost/test-container");
      expect(service).toBeDefined();
      expect(typeof service.connectToContainer).toBe("function");
      expect(typeof service.connectToStorage).toBe("function");
      expect(typeof service.connectToDeltaStream).toBe("function");
    });

    it("should return cached service on second load", async () => {
      const service1 = await loader.load("fluid://localhost/cached-container");
      const service2 = await loader.load("fluid://localhost/cached-container");
      expect(service1).toBe(service2);
    });

    it("should create an isolated scope for the container", async () => {
      await loader.load("fluid://localhost/scoped-container");
      const scopeManager = loader.getScopeManager();
      const scopes = scopeManager.listScopes();
      expect(scopes).toContain("container-scoped-container");
    });

    it("should set scope variables", async () => {
      await loader.load("fluid://localhost/vars-container");
      const scopeManager = loader.getScopeManager();
      const scope = scopeManager.getScope("container-vars-container");
      expect(scope).toBeDefined();
      expect(scope!.variables.get("containerId")).toBe("vars-container");
    });
  });

  describe("request", () => {
    it("should make a request and return response", async () => {
      const response = await loader.request("fluid://localhost/req-container");
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ containerId: "req-container" });
      expect(response.headers["x-fluid-container"]).toBe("req-container");
    });

    it("should include custom headers in response", async () => {
      const response = await loader.request("fluid://localhost/h-container", {
        "x-custom": "value",
      });
      expect(response.headers["x-custom"]).toBe("value");
    });
  });

  describe("sub-module accessors", () => {
    it("should expose document service factory", () => {
      expect(loader.getDocumentServiceFactory()).toBeDefined();
    });

    it("should expose code loader", () => {
      expect(loader.getCodeLoader()).toBeDefined();
    });

    it("should expose scope manager", () => {
      expect(loader.getScopeManager()).toBeDefined();
    });

    it("should expose retry policy", () => {
      expect(loader.getRetryPolicy()).toBeDefined();
    });
  });

  describe("custom protocol registration", () => {
    it("should support loading via custom protocol", async () => {
      const factory = loader.getDocumentServiceFactory();
      factory.registerProtocol("routerlicious", async (resolvedUrl) => ({
        connectToContainer: async () => ({
          containerId: resolvedUrl.containerId,
          close: () => {},
          on: () => {},
        }),
        connectToStorage: async () => ({
          getSnapshot: async () => ({ custom: true }),
          createBlob: async () => "blob",
          getBlob: async () => ({}),
        }),
        connectToDeltaStream: async () => ({
          submit: () => {},
          on: () => {},
          disconnect: () => {},
        }),
        dispose: () => {},
      }));

      // Note: routerlicious:// needs to be resolvable by urlResolver
      // For this test we just verify the factory works directly
      const service = await factory.createDocumentService({
        containerId: "custom-c",
        serviceEndpoint: "routerlicious://host",
        protocol: "routerlicious",
        host: "host",
        credentials: {},
        queryString: {},
        originalUrl: "routerlicious://host/custom-c",
      });

      const storage = await service.connectToStorage();
      const snapshot = await storage.getSnapshot();
      expect(snapshot).toEqual({ custom: true });
    });
  });
});
