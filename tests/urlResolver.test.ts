import { resolveUrl, isFluidUrl, buildFluidUrl } from "../src/urlResolver";
import { UrlResolutionError } from "../src/errors";

describe("URL Resolver", () => {
  describe("resolveUrl", () => {
    it("should resolve a fluid:// URL", () => {
      const result = resolveUrl("fluid://example.com/container-123?token=abc");

      expect(result.containerId).toBe("container-123");
      expect(result.serviceEndpoint).toBe("fluid://example.com");
      expect(result.protocol).toBe("fluid");
      expect(result.host).toBe("example.com");
      expect(result.port).toBeUndefined();
      expect(result.credentials.token).toBe("abc");
      expect(result.queryString.token).toBe("abc");
      expect(result.originalUrl).toBe("fluid://example.com/container-123?token=abc");
    });

    it("should resolve a fluid:// URL with port", () => {
      const result = resolveUrl("fluid://localhost:3000/my-container");

      expect(result.containerId).toBe("my-container");
      expect(result.host).toBe("localhost");
      expect(result.port).toBe(3000);
      expect(result.serviceEndpoint).toBe("fluid://localhost:3000");
    });

    it("should resolve an https:// URL with /fluid/ path", () => {
      const result = resolveUrl("https://fluid.example.com/fluid/doc-456?apiKey=key123");

      expect(result.containerId).toBe("doc-456");
      expect(result.protocol).toBe("https");
      expect(result.host).toBe("fluid.example.com");
      expect(result.credentials.apiKey).toBe("key123");
    });

    it("should resolve an http:// URL with /fluid/ path", () => {
      const result = resolveUrl("http://localhost:8080/fluid/test-container");

      expect(result.containerId).toBe("test-container");
      expect(result.protocol).toBe("http");
      expect(result.host).toBe("localhost");
      expect(result.port).toBe(8080);
    });

    it("should extract multiple query parameters", () => {
      const result = resolveUrl("fluid://host/id?token=t1&apiKey=k1&foo=bar");

      expect(result.queryString).toEqual({
        token: "t1",
        apiKey: "k1",
        foo: "bar",
      });
    });

    it("should extract authorization as token", () => {
      const result = resolveUrl("fluid://host/id?authorization=Bearer xyz");

      expect(result.credentials.token).toBe("Bearer xyz");
    });

    it("should throw UrlResolutionError for invalid URL", () => {
      expect(() => resolveUrl("not-a-url")).toThrow(UrlResolutionError);
    });

    it("should throw UrlResolutionError for unsupported protocol", () => {
      expect(() => resolveUrl("ftp://example.com/container")).toThrow(UrlResolutionError);
    });

    it("should throw UrlResolutionError for missing container ID in https URL", () => {
      expect(() => resolveUrl("https://example.com/container")).toThrow(UrlResolutionError);
    });

    it("should handle empty credentials when no auth params", () => {
      const result = resolveUrl("fluid://host/id");
      expect(result.credentials).toEqual({});
    });
  });

  describe("isFluidUrl", () => {
    it("should return true for fluid:// URLs", () => {
      expect(isFluidUrl("fluid://host/container")).toBe(true);
    });

    it("should return true for https:// URLs", () => {
      expect(isFluidUrl("https://host/fluid/container")).toBe(true);
    });

    it("should return true for http:// URLs", () => {
      expect(isFluidUrl("http://host/fluid/container")).toBe(true);
    });

    it("should return false for unsupported protocols", () => {
      expect(isFluidUrl("ftp://host/container")).toBe(false);
    });

    it("should return false for invalid URLs", () => {
      expect(isFluidUrl("not-a-url")).toBe(false);
    });
  });

  describe("buildFluidUrl", () => {
    it("should build a fluid:// URL", () => {
      const url = buildFluidUrl("example.com", "container-1");
      expect(url).toBe("fluid://example.com/container-1");
    });

    it("should build a fluid:// URL with port and params", () => {
      const url = buildFluidUrl("localhost", "c1", {
        port: 3000,
        params: { token: "abc" },
      });
      expect(url).toBe("fluid://localhost:3000/c1?token=abc");
    });

    it("should build an https:// URL", () => {
      const url = buildFluidUrl("example.com", "c1", { protocol: "https" });
      expect(url).toBe("https://example.com/fluid/c1");
    });
  });
});
