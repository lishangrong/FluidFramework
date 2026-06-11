/**
 * Fluid Container - Core Container Implementation
 *
 * Manages data model organization, shared object hosting, lifecycle events,
 * and data snapshots. The FluidContainer is the central runtime that holds
 * all DDS instances and coordinates their state.
 */

import { decodeSnapshot, encodeSnapshot } from "./binaryCodec";
import { SharedMap } from "./dds";
import {
  ContainerDisposedError,
  DDSAlreadyExistsError,
  DDSNotFoundError,
  DynamicTypeNotAllowedError,
  SchemaValidationError,
  SnapshotError,
} from "./errors";
import type {
  ContainerLifecycleEvent,
  ContainerLifecycleHandler,
  ContainerSchema,
  IContainer,
  IContainerSnapshot,
  IDDSOperation,
  IDistributedDataStructure,
  ISnapshotEntry,
} from "./types";

// ============================================================
// Supported DDS Types Registry
// ============================================================

const DDS_FACTORIES: Record<string, (id: string) => IDistributedDataStructure> = {
  SharedMap: (id) => new SharedMap(id),
};

function createDDSInstance(id: string, type: string): IDistributedDataStructure {
  const factory = DDS_FACTORIES[type];
  if (!factory) {
    throw new SchemaValidationError(`Unknown DDS type: "${type}". Registered types: [${Object.keys(DDS_FACTORIES).join(", ")}]`);
  }
  return factory(id);
}

// ============================================================
// FluidContainer
// ============================================================

/**
 * FluidContainer is the primary runtime for managing shared data.
 *
 * Responsibilities:
 * - Host all DDS instances defined by the ContainerSchema
 * - Manage the container lifecycle (create, load, dispose)
 * - Coordinate snapshots and state restoration
 * - Collect operations for delta-stream submission
 */
export class FluidContainer implements IContainer {
  public readonly schema: ContainerSchema;
  private ddsMap: Map<string, IDistributedDataStructure>;
  private lifecycleHandlers: Map<ContainerLifecycleEvent, Set<ContainerLifecycleHandler>>;
  private _disposed: boolean;
  private pendingOps: IDDSOperation[];

  constructor(schema: ContainerSchema) {
    FluidContainer.validateSchema(schema);
    this.schema = schema;
    this.ddsMap = new Map();
    this.lifecycleHandlers = new Map([
      ["onCreate", new Set()],
      ["onLoad", new Set()],
      ["onDispose", new Set()],
    ]);
    this._disposed = false;
    this.pendingOps = [];
  }

  // ---------- Properties ----------

  get disposed(): boolean {
    return this._disposed;
  }

  // ---------- Lifecycle ----------

  /**
   * Initialize the container: create all initial objects from the schema.
   * Fires the "onCreate" lifecycle event.
   */
  initialize(): void {
    this.ensureNotDisposed();

    for (const [id, type] of Object.entries(this.schema.initialObjects)) {
      if (this.ddsMap.has(id)) continue; // skip if already exists (e.g. loaded from snapshot)
      const dds = createDDSInstance(id, type);
      this.wireDDS(dds);
      this.ddsMap.set(id, dds);
    }

    this.fireLifecycle("onCreate");
  }

  /**
   * Load the container from a binary snapshot.
   * Restores all DDS state and fires the "onLoad" lifecycle event.
   */
  load(snapshot: Uint8Array): void {
    this.ensureNotDisposed();
    this.restoreInternal(snapshot);
    this.fireLifecycle("onLoad");
  }

  /**
   * Dispose the container: fire onDispose, release all DDS instances.
   */
  dispose(): void {
    if (this._disposed) return;
    this.fireLifecycle("onDispose");

    for (const dds of this.ddsMap.values()) {
      dds.dispose();
    }
    this.ddsMap.clear();
    this.pendingOps = [];

    // Clear handlers
    for (const handlers of this.lifecycleHandlers.values()) {
      handlers.clear();
    }

    this._disposed = true;
  }

  // ---------- DDS Management ----------

  getDDS(id: string): IDistributedDataStructure {
    this.ensureNotDisposed();
    const dds = this.ddsMap.get(id);
    if (!dds) {
      throw new DDSNotFoundError(id);
    }
    return dds;
  }

  createDDS(id: string, type: string): IDistributedDataStructure {
    this.ensureNotDisposed();

    if (this.ddsMap.has(id)) {
      throw new DDSAlreadyExistsError(id);
    }

    if (!this.schema.dynamicObjectTypes.includes(type)) {
      throw new DynamicTypeNotAllowedError(type, this.schema.dynamicObjectTypes);
    }

    const dds = createDDSInstance(id, type);
    this.wireDDS(dds);
    this.ddsMap.set(id, dds);
    return dds;
  }

  removeDDS(id: string): boolean {
    this.ensureNotDisposed();
    const dds = this.ddsMap.get(id);
    if (!dds) return false;
    dds.dispose();
    this.ddsMap.delete(id);
    return true;
  }

  listDDS(): string[] {
    this.ensureNotDisposed();
    return Array.from(this.ddsMap.keys());
  }

  // ---------- Snapshot ----------

  /**
   * Take a binary snapshot of the entire container state.
   * Returns a compact Uint8Array suitable for offline storage.
   */
  snapshot(): Uint8Array {
    this.ensureNotDisposed();

    const entries: ISnapshotEntry[] = [];
    for (const [id, dds] of this.ddsMap.entries()) {
      entries.push({
        id,
        type: dds.type,
        data: dds.toBinary(),
      });
    }

    const snapshot: IContainerSnapshot = {
      version: 1,
      timestamp: Date.now(),
      entries,
    };

    return encodeSnapshot(snapshot);
  }

  /**
   * Restore container state from a binary snapshot.
   * Clears existing DDS and rebuilds from the snapshot data.
   */
  restore(snapshot: Uint8Array): void {
    this.ensureNotDisposed();
    this.restoreInternal(snapshot);
  }

  // ---------- Operations ----------

  /**
   * Get all pending operations from all DDS instances.
   * Operations are drained after retrieval.
   */
  getPendingOps(): IDDSOperation[] {
    this.ensureNotDisposed();
    const ops = [...this.pendingOps];
    this.pendingOps = [];
    return ops;
  }

  // ---------- Lifecycle Event Subscription ----------

  on(event: ContainerLifecycleEvent, handler: ContainerLifecycleHandler): void {
    const handlers = this.lifecycleHandlers.get(event);
    if (handlers) {
      handlers.add(handler);
    }
  }

  off(event: ContainerLifecycleEvent, handler: ContainerLifecycleHandler): void {
    const handlers = this.lifecycleHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  // ============================================================
  // Internal Helpers
  // ============================================================

  /** Wire a DDS instance so its operations are collected by the container */
  private wireDDS(dds: IDistributedDataStructure): void {
    // We tap into the DDS via the "changed" event to collect ops.
    // SharedMap exposes drainPendingOps, but for the generic interface
    // we listen for change events instead.
    dds.on("changed", (op) => {
      this.pendingOps.push(op);
    });
  }

  /** Internal restore logic shared by load() and restore() */
  private restoreInternal(bytes: Uint8Array): void {
    let decoded: IContainerSnapshot;
    try {
      decoded = decodeSnapshot(bytes);
    } catch (e) {
      if (e instanceof SnapshotError) throw e;
      throw new SnapshotError("Failed to decode snapshot", e instanceof Error ? e : undefined);
    }

    // Dispose existing DDS
    for (const dds of this.ddsMap.values()) {
      dds.dispose();
    }
    this.ddsMap.clear();
    this.pendingOps = [];

    // Rebuild from snapshot entries
    for (const entry of decoded.entries) {
      // SharedMap.fromBinary handles its own binary format
      const dds = SharedMap.fromBinary(entry.data);
      this.wireDDS(dds);
      this.ddsMap.set(entry.id, dds);
    }
  }

  /** Fire a lifecycle event to all registered handlers */
  private fireLifecycle(event: ContainerLifecycleEvent): void {
    const handlers = this.lifecycleHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler();
      }
    }
  }

  /** Validate a ContainerSchema for correctness */
  private static validateSchema(schema: ContainerSchema): void {
    if (!schema || typeof schema !== "object") {
      throw new SchemaValidationError("Schema must be a non-null object");
    }
    if (!schema.initialObjects || typeof schema.initialObjects !== "object") {
      throw new SchemaValidationError("Schema must define initialObjects as a record");
    }
    if (!Array.isArray(schema.dynamicObjectTypes)) {
      throw new SchemaValidationError("Schema must define dynamicObjectTypes as an array");
    }

    // Validate that initialObjects DDS types are known
    for (const [id, type] of Object.entries(schema.initialObjects)) {
      if (!id || typeof id !== "string") {
        throw new SchemaValidationError(`Invalid DDS id: "${id}"`);
      }
      if (DDS_FACTORIES[type] === undefined) {
        throw new SchemaValidationError(`Unknown DDS type "${type}" for initial object "${id}"`);
      }
    }

    // Validate dynamicObjectTypes are known
    for (const type of schema.dynamicObjectTypes) {
      if (DDS_FACTORIES[type] === undefined) {
        throw new SchemaValidationError(`Unknown DDS type "${type}" in dynamicObjectTypes`);
      }
    }
  }

  private ensureNotDisposed(): void {
    if (this._disposed) {
      throw new ContainerDisposedError();
    }
  }
}
