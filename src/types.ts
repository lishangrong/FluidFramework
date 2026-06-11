/**
 * Fluid Loader - Core Type Definitions
 *
 * Defines all interfaces and types used across the Fluid Loader module.
 */

// ============================================================
// URL Resolution
// ============================================================

/** Credentials extracted from URL or headers */
export interface IFluidCredentials {
  /** Access token for authentication */
  token?: string;
  /** Additional credential key-value pairs */
  [key: string]: string | undefined;
}

/** Result of resolving a Fluid container URL */
export interface IFluidResolvedUrl {
  /** Unique container identifier */
  containerId: string;
  /** Full service endpoint URL (protocol + host + port) */
  serviceEndpoint: string;
  /** Protocol used (e.g. "fluid", "https") */
  protocol: string;
  /** Host name of the service */
  host: string;
  /** Port number, if specified */
  port?: number;
  /** Access credentials */
  credentials: IFluidCredentials;
  /** Original query string parameters */
  queryString: Record<string, string>;
  /** Original URL that was resolved */
  originalUrl: string;
}

// ============================================================
// Document Service
// ============================================================

/** Connection to a Fluid container */
export interface IContainerConnection {
  readonly containerId: string;
  close(): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
}

/** Connection to document storage (snapshot/ops) */
export interface IStorageConnection {
  getSnapshot(): Promise<unknown>;
  createBlob(content: unknown): Promise<string>;
  getBlob(blobId: string): Promise<unknown>;
}

/** Connection to delta stream (real-time ops) */
export interface IDeltaStreamConnection {
  submit(operation: unknown): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  disconnect(): void;
}

/** Service interface for interacting with a Fluid document */
export interface IDocumentService {
  connectToContainer(): Promise<IContainerConnection>;
  connectToStorage(): Promise<IStorageConnection>;
  connectToDeltaStream(): Promise<IDeltaStreamConnection>;
  dispose(): void;
}

/** Factory for creating document services from resolved URLs */
export interface IDocumentServiceFactory {
  createDocumentService(resolvedUrl: IFluidResolvedUrl): Promise<IDocumentService>;
  registerProtocol(
    protocol: string,
    factory: (resolvedUrl: IFluidResolvedUrl) => Promise<IDocumentService>,
  ): void;
  hasProtocol(protocol: string): boolean;
}

// ============================================================
// Code Loading
// ============================================================

/** Loaded Fluid code module details */
export interface IFluidCodeDetails {
  /** Package name (e.g. "@fluidframework/map") */
  package: string;
  /** Package version */
  version: string;
  /** Module configuration */
  config: Record<string, unknown>;
  /** The loaded module exports */
  module?: Record<string, unknown>;
}

/** Loader interface for DDS code modules */
export interface ICodeLoader {
  load(packageName: string, version?: string): Promise<IFluidCodeDetails>;
  registerCodeHandler(
    packageName: string,
    handler: () => Promise<IFluidCodeDetails>,
  ): void;
  isLoaded(packageName: string, version?: string): boolean;
  clearCache(packageName?: string): void;
}

/** Status of a code loading operation */
export enum CodeLoadStatus {
  NOT_LOADED = "NOT_LOADED",
  LOADING = "LOADING",
  LOADED = "LOADED",
  LOAD_FAILED = "LOAD_FAILED",
}

// ============================================================
// Scope Management
// ============================================================

/** Context for an isolated execution scope */
export interface IScopeContext {
  /** Scope name */
  name: string;
  /** Scope-local variables */
  variables: Map<string, unknown>;
  /** Parent scope name, if any */
  parentScope?: string;
  /** Creation timestamp */
  createdAt: number;
}

/** Manages isolated execution scopes for code modules */
export interface IScopeManager {
  createScope(name: string, parentScope?: string): IScopeContext;
  getScope(name: string): IScopeContext | undefined;
  executeInScope<T>(name: string, fn: (scope: IScopeContext) => T): T;
  destroyScope(name: string): boolean;
  listScopes(): string[];
}

// ============================================================
// Retry Policy
// ============================================================

/** Circuit breaker states */
export enum CircuitBreakerState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

/** Options for retry execution */
export interface IRetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 200) */
  baseDelay?: number;
  /** Maximum delay cap in ms (default: 10000) */
  maxDelay?: number;
  /** Custom retryable error checker */
  isRetryable?: (error: Error) => boolean;
  /** Called on each retry with attempt number and error */
  onRetry?: (attempt: number, error: Error) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/** Retry policy with exponential backoff and circuit breaker */
export interface IRetryPolicy {
  execute<T>(fn: () => Promise<T>, options?: IRetryOptions): Promise<T>;
  getState(): CircuitBreakerState;
  reset(): void;
}

// ============================================================
// Top-level Loader
// ============================================================

/** Headers for loader requests */
export interface ILoaderHeaders {
  [key: string]: string;
}

/** Response from a loader request */
export interface ILoaderResponse {
  status: number;
  data: unknown;
  headers: Record<string, string>;
}

/** Top-level Fluid Loader facade */
export interface ILoader {
  resolve(url: string): Promise<IFluidResolvedUrl>;
  load(url: string): Promise<IDocumentService>;
  request(url: string, headers?: ILoaderHeaders): Promise<ILoaderResponse>;
}
