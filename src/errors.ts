/**
 * Fluid Loader - Custom Error Classes
 *
 * Provides structured error types for different failure scenarios
 * in the loading pipeline.
 */

/** Base error class for all Fluid Loader errors */
export class FluidLoaderError extends Error {
  public readonly code: string;
  public readonly timestamp: number;

  constructor(message: string, code: string) {
    super(message);
    this.name = "FluidLoaderError";
    this.code = code;
    this.timestamp = Date.now();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a URL cannot be parsed as a valid Fluid container locator */
export class UrlResolutionError extends FluidLoaderError {
  public readonly url: string;

  constructor(message: string, url: string) {
    super(message, "URL_RESOLUTION_ERROR");
    this.name = "UrlResolutionError";
    this.url = url;
  }
}

/** Thrown when a URL protocol is not registered in the document service factory */
export class UnsupportedProtocolError extends FluidLoaderError {
  public readonly protocol: string;
  public readonly supportedProtocols: string[];

  constructor(protocol: string, supportedProtocols: string[]) {
    super(
      `Unsupported protocol "${protocol}". Supported: [${supportedProtocols.join(", ")}]`,
      "UNSUPPORTED_PROTOCOL",
    );
    this.name = "UnsupportedProtocolError";
    this.protocol = protocol;
    this.supportedProtocols = supportedProtocols;
  }
}

/** Thrown when DDS code loading fails */
export class CodeLoadError extends FluidLoaderError {
  public readonly packageName: string;
  public readonly version?: string;
  public readonly cause?: Error;

  constructor(message: string, packageName: string, version?: string, cause?: Error) {
    super(message, "CODE_LOAD_ERROR");
    this.name = "CodeLoadError";
    this.packageName = packageName;
    this.version = version;
    this.cause = cause;
  }
}

/** Thrown when a scope operation fails */
export class ScopeError extends FluidLoaderError {
  public readonly scopeName: string;

  constructor(message: string, scopeName: string) {
    super(message, "SCOPE_ERROR");
    this.name = "ScopeError";
    this.scopeName = scopeName;
  }
}

/** Thrown when all retry attempts are exhausted */
export class RetryExhaustedError extends FluidLoaderError {
  public readonly attempts: number;
  public readonly lastError: Error;

  constructor(attempts: number, lastError: Error) {
    super(
      `All ${attempts} retry attempts exhausted. Last error: ${lastError.message}`,
      "RETRY_EXHAUSTED",
    );
    this.name = "RetryExhaustedError";
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/** Thrown when the circuit breaker is open and requests are rejected */
export class CircuitBreakerOpenError extends FluidLoaderError {
  public readonly resetTime: number;

  constructor(resetTime: number) {
    super(
      `Circuit breaker is OPEN. Requests are rejected until ${new Date(resetTime).toISOString()}`,
      "CIRCUIT_BREAKER_OPEN",
    );
    this.name = "CircuitBreakerOpenError";
    this.resetTime = resetTime;
  }
}

/** Thrown when a document service operation fails */
export class DocumentServiceError extends FluidLoaderError {
  public readonly serviceEndpoint: string;

  constructor(message: string, serviceEndpoint: string) {
    super(message, "DOCUMENT_SERVICE_ERROR");
    this.name = "DocumentServiceError";
    this.serviceEndpoint = serviceEndpoint;
  }
}

/** Network-related error (connectivity issues, timeouts) */
export class NetworkError extends FluidLoaderError {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message, "NETWORK_ERROR");
    this.name = "NetworkError";
    this.statusCode = statusCode;
  }
}
