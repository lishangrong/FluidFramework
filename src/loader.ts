/**
 * Fluid Loader - Top-level Loader Facade
 *
 * Composes all sub-modules (URL resolver, document service factory,
 * code loader, scope manager, retry policy) into a single unified
 * loading interface.
 */

import type {
  IDocumentService,
  IFluidResolvedUrl,
  ILoader,
  ILoaderHeaders,
  ILoaderResponse,
} from "./types";
import { resolveUrl } from "./urlResolver";
import { FluidDocumentServiceFactory } from "./documentServiceFactory";
import { FluidCodeLoader } from "./codeLoader";
import { ScopeManager } from "./scope";
import { RetryPolicy } from "./retryPolicy";
import { FluidLoaderError, UrlResolutionError } from "./errors";

/** Options for configuring the Fluid Loader */
export interface FluidLoaderOptions {
  /** Base URL for module resolution */
  moduleBaseUrl?: string;
  /** Maximum retry attempts for network operations */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms */
  retryBaseDelay?: number;
  /** Maximum delay cap in ms */
  retryMaxDelay?: number;
}

/** Fallback URL patterns to try when primary resolution fails */
const FALLBACK_PATTERNS: Array<(url: string) => string> = [
  // Try adding https:// prefix if missing
  (url) => (url.startsWith("http") || url.startsWith("fluid") ? url : `https://${url}`),
  // Try converting https to fluid protocol
  (url) => url.replace(/^https:/, "fluid:"),
  // Try converting fluid to https protocol
  (url) => url.replace(/^fluid:/, "https:"),
];

export class FluidLoader implements ILoader {
  private readonly documentServiceFactory: FluidDocumentServiceFactory;
  private readonly codeLoader: FluidCodeLoader;
  private readonly scopeManager: ScopeManager;
  private readonly retryPolicy: RetryPolicy;
  private readonly options: FluidLoaderOptions;

  /** Cache of loaded document services keyed by container ID */
  private readonly serviceCache = new Map<string, IDocumentService>();

  constructor(options: FluidLoaderOptions = {}) {
    this.options = options;
    this.documentServiceFactory = new FluidDocumentServiceFactory();
    this.codeLoader = new FluidCodeLoader(options.moduleBaseUrl);
    this.scopeManager = new ScopeManager();
    this.retryPolicy = new RetryPolicy();
  }

  /**
   * Resolve a Fluid container URL into its component parts.
   * Tries fallback URL patterns if primary resolution fails.
   */
  async resolve(url: string): Promise<IFluidResolvedUrl> {
    // Try primary resolution
    try {
      return resolveUrl(url);
    } catch (primaryError) {
      if (!(primaryError instanceof UrlResolutionError)) {
        throw primaryError;
      }

      // Try fallback patterns
      for (const pattern of FALLBACK_PATTERNS) {
        try {
          const fallbackUrl = pattern(url);
          if (fallbackUrl !== url) {
            return resolveUrl(fallbackUrl);
          }
        } catch {
          // Continue to next fallback
        }
      }

      // All fallbacks exhausted, throw original error
      throw primaryError;
    }
  }

  /**
   * Load a Fluid container by URL.
   * Resolves URL → creates DocumentService → loads code → initializes in isolated scope.
   */
  async load(url: string): Promise<IDocumentService> {
    const resolved = await this.resolve(url);

    // Check cache first
    const cached = this.serviceCache.get(resolved.containerId);
    if (cached) {
      return cached;
    }

    // Create document service with retry
    const service = await this.retryPolicy.execute(
      () => this.documentServiceFactory.createDocumentService(resolved),
      {
        maxRetries: this.options.maxRetries ?? 3,
        baseDelay: this.options.retryBaseDelay ?? 200,
        maxDelay: this.options.retryMaxDelay ?? 10_000,
      },
    );

    // Create an isolated scope for this container
    const scopeName = `container-${resolved.containerId}`;
    this.scopeManager.createScope(scopeName);

    // Initialize within the scope
    this.scopeManager.executeInScope(scopeName, (scope) => {
      scope.variables.set("containerId", resolved.containerId);
      scope.variables.set("serviceEndpoint", resolved.serviceEndpoint);
      scope.variables.set("credentials", resolved.credentials);
      scope.variables.set("documentService", service);
    });

    // Cache the service
    this.serviceCache.set(resolved.containerId, service);

    return service;
  }

  /**
   * Make a request to a Fluid container.
   * Loads the container if not already loaded, then wraps in retry logic.
   */
  async request(url: string, headers?: ILoaderHeaders): Promise<ILoaderResponse> {
    return this.retryPolicy.execute(
      async () => {
        const service = await this.load(url);
        const resolved = await this.resolve(url);

        // Connect to container within a scope
        const scopeName = `request-${resolved.containerId}-${Date.now()}`;
        this.scopeManager.createScope(scopeName, `container-${resolved.containerId}`);

        try {
          const connection = await this.serviceRetry(
            () => service.connectToContainer(),
            resolved,
          );

          const response: ILoaderResponse = {
            status: 200,
            data: { containerId: connection.containerId },
            headers: {
              "x-fluid-container": resolved.containerId,
              "x-fluid-endpoint": resolved.serviceEndpoint,
              ...headers,
            },
          };

          connection.close();
          return response;
        } finally {
          this.scopeManager.destroyScope(scopeName);
        }
      },
      {
        maxRetries: this.options.maxRetries ?? 2,
        baseDelay: this.options.retryBaseDelay ?? 200,
        maxDelay: this.options.retryMaxDelay ?? 10_000,
      },
    );
  }

  // ---- Accessor methods for sub-modules (for advanced usage) ----

  getDocumentServiceFactory(): FluidDocumentServiceFactory {
    return this.documentServiceFactory;
  }

  getCodeLoader(): FluidCodeLoader {
    return this.codeLoader;
  }

  getScopeManager(): ScopeManager {
    return this.scopeManager;
  }

  getRetryPolicy(): RetryPolicy {
    return this.retryPolicy;
  }

  // ---- Private helpers ----

  private async serviceRetry<T>(
    fn: () => Promise<T>,
    resolved: IFluidResolvedUrl,
  ): Promise<T> {
    return this.retryPolicy.execute(fn, {
      maxRetries: 2,
      baseDelay: 100,
      maxDelay: 5_000,
      onRetry: (attempt, error) => {
        // Log retry info (in a real implementation, this would use a logger)
        console.warn(
          `[FluidLoader] Retry ${attempt} for container "${resolved.containerId}": ${error.message}`,
        );
      },
    });
  }
}
