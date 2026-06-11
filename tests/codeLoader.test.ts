import { FluidCodeLoader, parsePackageSpecifier } from "../src/codeLoader";
import { CodeLoadError } from "../src/errors";

describe("parsePackageSpecifier", () => {
  it("should parse simple package name", () => {
    expect(parsePackageSpecifier("my-package")).toEqual({
      name: "my-package",
      version: undefined,
    });
  });

  it("should parse package with version", () => {
    expect(parsePackageSpecifier("my-package@1.2.3")).toEqual({
      name: "my-package",
      version: "1.2.3",
    });
  });

  it("should parse scoped package", () => {
    expect(parsePackageSpecifier("@fluid/map")).toEqual({
      name: "@fluid/map",
      version: undefined,
    });
  });

  it("should parse scoped package with version", () => {
    expect(parsePackageSpecifier("@fluid/map@2.0.0")).toEqual({
      name: "@fluid/map",
      version: "2.0.0",
    });
  });

  it("should handle scoped package without slash", () => {
    expect(parsePackageSpecifier("@fluidonly")).toEqual({
      name: "@fluidonly",
      version: undefined,
    });
  });
});

describe("FluidCodeLoader", () => {
  let loader: FluidCodeLoader;

  beforeEach(() => {
    loader = new FluidCodeLoader("/cdn/modules/");
  });

  describe("registerCodeHandler", () => {
    it("should load from registered handler", async () => {
      loader.registerCodeHandler("@fluid/map", async () => ({
        package: "@fluid/map",
        version: "1.0.0",
        config: { type: "map" },
        module: { Map: class {} },
      }));

      const result = await loader.load("@fluid/map");
      expect(result.package).toBe("@fluid/map");
      expect(result.version).toBe("1.0.0");
      expect(result.config.type).toBe("map");
    });
  });

  describe("caching", () => {
    it("should cache loaded modules", async () => {
      let callCount = 0;
      loader.registerCodeHandler("pkg", async () => {
        callCount++;
        return { package: "pkg", version: "1.0.0", config: {} };
      });

      await loader.load("pkg");
      await loader.load("pkg");

      expect(callCount).toBe(1);
    });

    it("should report isLoaded correctly", async () => {
      expect(loader.isLoaded("pkg")).toBe(false);

      loader.registerCodeHandler("pkg", async () => ({
        package: "pkg",
        version: "1.0.0",
        config: {},
      }));

      await loader.load("pkg");
      expect(loader.isLoaded("pkg")).toBe(true);
    });

    it("should retry after failed load", async () => {
      let attempts = 0;
      loader.registerCodeHandler("flaky", async () => {
        attempts++;
        if (attempts === 1) throw new Error("temporary failure");
        return { package: "flaky", version: "1.0.0", config: {} };
      });

      // First load fails
      await expect(loader.load("flaky")).rejects.toThrow();

      // Second load should retry (not cached failure)
      const result = await loader.load("flaky");
      expect(result.package).toBe("flaky");
      expect(attempts).toBe(2);
    });
  });

  describe("clearCache", () => {
    it("should clear specific package cache", async () => {
      let callCount = 0;
      loader.registerCodeHandler("pkg", async () => {
        callCount++;
        return { package: "pkg", version: "1.0.0", config: {} };
      });

      await loader.load("pkg");
      loader.clearCache("pkg");
      await loader.load("pkg");

      expect(callCount).toBe(2);
    });

    it("should clear all caches", async () => {
      let countA = 0;
      let countB = 0;

      loader.registerCodeHandler("a", async () => {
        countA++;
        return { package: "a", version: "1.0.0", config: {} };
      });
      loader.registerCodeHandler("b", async () => {
        countB++;
        return { package: "b", version: "1.0.0", config: {} };
      });

      await loader.load("a");
      await loader.load("b");
      loader.clearCache();
      await loader.load("a");
      await loader.load("b");

      expect(countA).toBe(2);
      expect(countB).toBe(2);
    });
  });

  describe("dynamic import failure", () => {
    it("should throw CodeLoadError for missing module", async () => {
      await expect(loader.load("nonexistent-module")).rejects.toThrow(CodeLoadError);
    });
  });

  describe("version handling", () => {
    it("should load specific version via handler", async () => {
      loader.registerCodeHandler("pkg", async () => ({
        package: "pkg",
        version: "2.0.0",
        config: {},
      }));

      const result = await loader.load("pkg", "2.0.0");
      expect(result.version).toBe("2.0.0");
    });

    it("should cache different versions separately", async () => {
      let count = 0;
      loader.registerCodeHandler("pkg", async () => {
        count++;
        return { package: "pkg", version: `${count}.0.0`, config: {} };
      });

      await loader.load("pkg", "1.0.0");
      await loader.load("pkg", "2.0.0");

      expect(count).toBe(2);
      expect(loader.isLoaded("pkg", "1.0.0")).toBe(true);
      expect(loader.isLoaded("pkg", "2.0.0")).toBe(true);
    });
  });
});
