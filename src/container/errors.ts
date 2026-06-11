/**
 * Fluid Container - Custom Error Classes
 *
 * Provides structured error types for container-specific failure scenarios.
 */

/** Base error class for all Fluid Container errors */
export class ContainerError extends Error {
  public readonly code: string;
  public readonly timestamp: number;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ContainerError";
    this.code = code;
    this.timestamp = Date.now();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a ContainerSchema is invalid */
export class SchemaValidationError extends ContainerError {
  constructor(message: string) {
    super(message, "SCHEMA_VALIDATION_ERROR");
    this.name = "SchemaValidationError";
  }
}

/** Thrown when accessing a DDS that does not exist */
export class DDSNotFoundError extends ContainerError {
  public readonly ddsId: string;

  constructor(ddsId: string) {
    super(`DDS with id "${ddsId}" not found in container`, "DDS_NOT_FOUND");
    this.name = "DDSNotFoundError";
    this.ddsId = ddsId;
  }
}

/** Thrown when creating a DDS with an id that already exists */
export class DDSAlreadyExistsError extends ContainerError {
  public readonly ddsId: string;

  constructor(ddsId: string) {
    super(`DDS with id "${ddsId}" already exists in container`, "DDS_ALREADY_EXISTS");
    this.name = "DDSAlreadyExistsError";
    this.ddsId = ddsId;
  }
}

/** Thrown when attempting to create a DDS of a type not allowed by schema */
export class DynamicTypeNotAllowedError extends ContainerError {
  public readonly ddsType: string;
  public readonly allowedTypes: string[];

  constructor(ddsType: string, allowedTypes: string[]) {
    super(
      `DDS type "${ddsType}" is not allowed for dynamic creation. Allowed types: [${allowedTypes.join(", ")}]`,
      "DYNAMIC_TYPE_NOT_ALLOWED",
    );
    this.name = "DynamicTypeNotAllowedError";
    this.ddsType = ddsType;
    this.allowedTypes = allowedTypes;
  }
}

/** Thrown when snapshot encoding or decoding fails */
export class SnapshotError extends ContainerError {
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message, "SNAPSHOT_ERROR");
    this.name = "SnapshotError";
    this.cause = cause;
  }
}

/** Thrown when operating on a disposed container */
export class ContainerDisposedError extends ContainerError {
  constructor() {
    super("Cannot perform operation on a disposed container", "CONTAINER_DISPOSED");
    this.name = "ContainerDisposedError";
  }
}
