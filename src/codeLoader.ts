/**
 * Fluid Loader - Code Loader
 *
 * Asynchronously loads DDS (Distributed Data Structure) code modules
 * at runtime. Supports dynamic import(), module caching, version
 * resolution, and pre-registration of code handlers.
 */

import type { ICodeLoader, IFluidCodeDetails } from "./types";
import { CodeLoadStatus } from "./types";
import { CodeLoadError } from "./errors";

/** Internal cache entry tracking load state */
interface CacheEntry {
  status: CodeLoadStatus;
  promise?: Promise<IFluidCodeDetails>;
  result?: IFluidCodeDetails;
  error?: Error;
}

/**
 * Parse a package specifier into name and version.
 * Supports formats: "@scope/pkg@1.0.0", "pkg@1.0.0", "@scope/pkg", "pkg"
 */
function parsePackageSpecifier(specifier: string): { name: string; version?: string } {
  // Handle scoped packages: @scope/name@version
  if (specifier.startsWith("@")) {
    const slashIndex = specifier.indexOf("/");
    if (slashIndex === -1) {
      return { name: specifier };
    }
    const afterSlash = specifier.slice(slashIndex + 1);
    const atIndex = afterSlash.lastIndexOf("@");
    if (atIndex > 0) {
      return {
        name: specifier.slice(0, slashIndex + 1 + atIndex),
        version: afterSlash.slice(atIndex + 1),
      };
    }
    return { name: specifier };
  }

  // Non-scoped: name@version
  const atIndex = specifier.lastIndexOf("@");
  if (atIndex > 0) {
    return {
      name: specifier.slice(0, atIndex),
      version: specifier.slice(atIndex + 1),
    };
  }
  return { name: specifier };
}

/** Build a cache key from package name and version */
function cacheKey(packageName: string, version?: string): string {
  return version ? `${packageName}@${version}` : packageName;
}

/**
 * Concrete implementation of ICodeLoader.
 *
 * Uses dynamic import() for browser-side module loading, with a
 * promise-based cache to prevent duplicate concurrent loads.
 */
export class FluidCodeLoader implements ICodeLoader {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly handlers = new Map<string, () => Promise<IFluidCodeDetails>>();
  private readonly moduleBaseUrl: string;

  /**
   * @param moduleBaseUrl - Base URL for resolving module imports (e.g. "/cdn/modules/")
   */
  constructor(moduleBaseUrl: string = "/modules/") {
    this.moduleBaseUrl = moduleBaseUrl.endsWith("/")
      ? moduleBaseUrl
      : moduleBaseUrl + "/";
  }

  async load(packageName: string, version?: string): Promise<IFluidCodeDetails> {
    const key = cacheKey(packageName, version);

    // Check cache first
    const cached = this.cache.get(key);
    if (cached) {
      // If currently loading, await the in-flight promise
      if (cached.status === CodeLoadStatus.LOADING && cached.promise) {
        return cached.promise;
      }
      // If already loaded, return cached result
      if (cached.status === CodeLoadStatus.LOADED && cached.result) {
        return cached.result;
      }
      // If previously failed, remove from cache and retry
      if (cached.status === CodeLoadStatus.LOAD_FAILED) {
        this.cache.delete(key);
      }
    }

    // Start loading
    const entry: CacheEntry = { status: CodeLoadStatus.LOADING };
    this.cache.set(key, entry);

    const loadPromise = this.performLoad(packageName, version);
    entry.promise = loadPromise;

    try {
      const result = await loadPromise;
      entry.status = CodeLoadStatus.LOADED;
      entry.result = result;
      entry.promise = undefined;
      return result;
    } catch (err) {
      entry.status = CodeLoadStatus.LOAD_FAILED;
      entry.error = err instanceof Error ? err : new Error(String(err));
      entry.promise = undefined;
      throw entry.error;
    }
  }

  registerCodeHandler(
    packageName: string,
    handler: () => Promise<IFluidCodeDetails>,
  ): void {
    this.handlers.set(packageName, handler);
  }

  isLoaded(packageName: string, version?: string): boolean {
    const key = cacheKey(packageName, version);
    const entry = this.cache.get(key);
    return entry?.status === CodeLoadStatus.LOADED;
  }

  clearCache(packageName?: string): void {
    if (packageName) {
      // Clear all entries matching this package name (any version)
      for (const key of this.cache.keys()) {
        if (key === packageName || key.startsWith(packageName + "@")) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  private async performLoad(
    packageName: string,
    version?: string,
  ): Promise<IFluidCodeDetails> {
    // Check for pre-registered handler first
    const handler = this.handlers.get(packageName);
    if (handler) {
      return handler();
    }

    // Dynamic import
    const moduleUrl = this.resolveModuleUrl(packageName, version);

    try {
      const module = await import(moduleUrl);

      return {
        package: packageName,
        version: version ?? "latest",
        config: module.config ?? {},
        module: module as Record<string, unknown>,
      };
    } catch (err) {
      throw new CodeLoadError(
        `Failed to load module "${packageName}${version ? "@" + version : ""}" from ${moduleUrl}: ${err instanceof Error ? err.message : String(err)}`,
        packageName,
        version,
        err instanceof Error ? err : undefined,
      );
    }
  }

  private resolveModuleUrl(packageName: string, version?: string): string {
    const versionPath = version ? `@${version}` : "";
    return `${this.moduleBaseUrl}${packageName}${versionPath}/index.js`;
  }
}

/** Expose parsePackageSpecifier for testing */
export { parsePackageSpecifier };
