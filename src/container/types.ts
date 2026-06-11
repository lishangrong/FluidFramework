/**
 * Fluid Container - Core Type Definitions
 *
 * Defines all interfaces and types for the Container module,
 * including schema, DDS, snapshots, and lifecycle management.
 */

// ============================================================
// Distributed Data Structure (DDS)
// ============================================================

/** A single operation applied to a DDS for cross-client sync */
export interface IDDSOperation {
  /** Unique operation identifier */
  opId: string;
  /** Operation type */
  type:
    | "set"
    | "delete"
    | "clear"
    | "tree-insert"
    | "tree-delete"
    | "tree-move"
    | "tree-set-value"
    | "tree-transaction";
  /** Key affected (not present for "clear" or tree ops) */
  key?: string;
  /** Value set (only for "set") */
  value?: unknown;
  /** Timestamp when the operation was created */
  timestamp: number;

  // ---------- Tree-specific fields ----------

  /** Target node id (tree-delete, tree-move, tree-set-value) */
  nodeId?: string;
  /** Parent node id (tree-insert, tree-move) */
  parentId?: string;
  /** Child index within parent (tree-insert, tree-move) */
  index?: number;
  /** Node type tag (tree-insert) */
  nodeType?: string;
  /** Atomic child operations (tree-transaction) */
  childOps?: IDDSOperation[];
}

/** Event types emitted by a DDS */
export type DDSEventType = "changed";

/** Handler for DDS change events */
export type DDSChangeHandler = (operation: IDDSOperation) => void;

/** Generic distributed data structure interface */
export interface IDistributedDataStructure {
  /** Unique identifier for this DDS instance */
  readonly id: string;
  /** Type name of the DDS (e.g. "SharedMap") */
  readonly type: string;
  /** Whether this DDS has been disposed */
  readonly disposed: boolean;

  /** Get a value by key */
  get(key: string): unknown;
  /** Set a key-value pair */
  set(key: string, value: unknown): void;
  /** Delete a key */
  delete(key: string): boolean;
  /** Check if a key exists */
  has(key: string): boolean;
  /** Get all keys */
  keys(): string[];
  /** Get the number of entries */
  size(): number;
  /** Clear all entries */
  clear(): void;

  /** Subscribe to DDS events */
  on(event: DDSEventType, handler: DDSChangeHandler): void;
  /** Unsubscribe from DDS events */
  off(event: DDSEventType, handler: DDSChangeHandler): void;

  /** Apply a remote operation (for cross-client sync) */
  applyOp(operation: IDDSOperation): void;

  /** Serialize this DDS to binary format */
  toBinary(): Uint8Array;

  /** Dispose this DDS, releasing resources */
  dispose(): void;
}

// ============================================================
// SharedTree Types
// ============================================================

/** Supported tree node types */
export type TreeNodeType = "string" | "number" | "boolean" | "object" | "array" | "custom";

/** Read-only view of a tree node */
export interface ITreeNode {
  /** Globally unique node identifier */
  readonly nodeId: string;
  /** Node data type */
  readonly type: TreeNodeType;
  /** Leaf value (null for object/array nodes) */
  readonly value: unknown;
  /** Parent node id, or null for the root */
  readonly parentId: string | null;
  /** Ordered child node ids */
  readonly children: string[];
  /** Extensible metadata */
  readonly metadata: ReadonlyMap<string, unknown>;
}

// ============================================================
// Container Schema
// ============================================================

/** Schema defining what objects a container holds */
export interface ContainerSchema {
  /** Objects automatically created when the container is initialized.
   *  Maps object id to DDS type name (e.g. "SharedMap"). */
  initialObjects: Record<string, string>;

  /** DDS type names allowed for dynamic creation during the container's lifetime */
  dynamicObjectTypes: string[];
}

// ============================================================
// Container Snapshot
// ============================================================

/** A serialized entry for a single DDS within a snapshot */
export interface ISnapshotEntry {
  /** DDS id */
  id: string;
  /** DDS type name */
  type: string;
  /** Binary-serialized DDS data */
  data: Uint8Array;
}

/** Full container snapshot for offline persistence */
export interface IContainerSnapshot {
  /** Snapshot format version */
  version: number;
  /** Timestamp when the snapshot was taken */
  timestamp: number;
  /** Serialized DDS entries */
  entries: ISnapshotEntry[];
}

// ============================================================
// Container Lifecycle
// ============================================================

/** Lifecycle events emitted by a container */
export type ContainerLifecycleEvent = "onCreate" | "onLoad" | "onDispose";

/** Handler for container lifecycle events */
export type ContainerLifecycleHandler = () => void;

// ============================================================
// Container Interface
// ============================================================

/** The main container interface for managing DDS objects and lifecycle */
export interface IContainer {
  /** Whether this container has been disposed */
  readonly disposed: boolean;

  /** Initialize the container: create initial objects from schema and fire onCreate */
  initialize(): void;

  /** Load the container from a binary snapshot and fire onLoad */
  load(snapshot: Uint8Array): void;

  /** Get a DDS by its id */
  getDDS(id: string): IDistributedDataStructure;

  /** Dynamically create a new DDS (type must be in schema.dynamicObjectTypes) */
  createDDS(id: string, type: string): IDistributedDataStructure;

  /** Remove a DDS by id */
  removeDDS(id: string): boolean;

  /** List all DDS ids in this container */
  listDDS(): string[];

  /** Take a binary snapshot of the entire container state */
  snapshot(): Uint8Array;

  /** Restore container state from a binary snapshot */
  restore(snapshot: Uint8Array): void;

  /** Get all pending operations from all DDS for delta-stream submission */
  getPendingOps(): IDDSOperation[];

  /** Dispose the container: fire onDispose, release all DDS */
  dispose(): void;

  /** Subscribe to container lifecycle events */
  on(event: ContainerLifecycleEvent, handler: ContainerLifecycleHandler): void;

  /** Unsubscribe from container lifecycle events */
  off(event: ContainerLifecycleEvent, handler: ContainerLifecycleHandler): void;
}
