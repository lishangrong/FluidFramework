/**
 * Fluid Container - Public API
 *
 * Re-exports all container types, classes, and functions.
 */

// Types
export type {
  ContainerLifecycleEvent,
  ContainerLifecycleHandler,
  ContainerSchema,
  DDSChangeHandler,
  DDSEventType,
  IContainer,
  IContainerSnapshot,
  IDDSOperation,
  IDistributedDataStructure,
  ISnapshotEntry,
} from "./types";

// Implementation
export { FluidContainer } from "./container";
export { SharedMap } from "./dds";
export { BinaryReader, BinaryWriter, decodeSnapshot, encodeSnapshot } from "./binaryCodec";

// Errors
export {
  ContainerDisposedError,
  ContainerError,
  DDSAlreadyExistsError,
  DDSNotFoundError,
  DynamicTypeNotAllowedError,
  SchemaValidationError,
  SnapshotError,
} from "./errors";
