/**
 * Fluid Container - SharedMap DDS Implementation
 *
 * A distributed shared map that supports CRUD operations, event-driven
 * change notifications, remote operation application for cross-client sync,
 * and compact binary serialization.
 */

import { BinaryReader, BinaryWriter } from "./binaryCodec";
import { ContainerDisposedError } from "./errors";
import type {
  DDSChangeHandler,
  DDSEventType,
  IDistributedDataStructure,
  IDDSOperation,
} from "./types";

// ============================================================
// Value Type Tags (for binary encoding)
// ============================================================

const enum ValueType {
  NULL = 0,
  BOOLEAN = 1,
  NUMBER = 2,
  STRING = 3,
  JSON = 4,
}

/** Encode a JS value into the binary writer with a type tag */
function encodeValue(writer: BinaryWriter, value: unknown): void {
  if (value === null || value === undefined) {
    writer.writeUint8(ValueType.NULL);
  } else if (typeof value === "boolean") {
    writer.writeUint8(ValueType.BOOLEAN);
    writer.writeUint8(value ? 1 : 0);
  } else if (typeof value === "number") {
    writer.writeUint8(ValueType.NUMBER);
    writer.writeFloat64(value);
  } else if (typeof value === "string") {
    writer.writeUint8(ValueType.STRING);
    writer.writeString(value);
  } else {
    // Fallback: JSON-serialize complex objects
    writer.writeUint8(ValueType.JSON);
    writer.writeString(JSON.stringify(value));
  }
}

/** Decode a JS value from the binary reader using the type tag */
function decodeValue(reader: BinaryReader): unknown {
  const tag = reader.readUint8();
  switch (tag) {
    case ValueType.NULL:
      return null;
    case ValueType.BOOLEAN:
      return reader.readUint8() === 1;
    case ValueType.NUMBER:
      return reader.readFloat64();
    case ValueType.STRING:
      return reader.readString();
    case ValueType.JSON:
      return JSON.parse(reader.readString());
    default:
      throw new Error(`Unknown value type tag: ${tag}`);
  }
}

// ============================================================
// SharedMap Implementation
// ============================================================

let opCounter = 0;
function generateOpId(): string {
  return `op-${Date.now()}-${++opCounter}`;
}

/**
 * A distributed shared map data structure.
 *
 * Supports:
 * - CRUD operations with change event notifications
 * - Operation logging for cross-client synchronization
 * - Compact binary serialization
 */
export class SharedMap implements IDistributedDataStructure {
  public readonly id: string;
  public readonly type = "SharedMap";

  private data: Map<string, unknown>;
  private handlers: Set<DDSChangeHandler>;
  private _disposed: boolean;
  private pendingOps: IDDSOperation[];

  constructor(id: string) {
    this.id = id;
    this.data = new Map();
    this.handlers = new Set();
    this._disposed = false;
    this.pendingOps = [];
  }

  // ---------- Properties ----------

  get disposed(): boolean {
    return this._disposed;
  }

  // ---------- CRUD Operations ----------

  get(key: string): unknown {
    this.ensureNotDisposed();
    return this.data.get(key);
  }

  set(key: string, value: unknown): void {
    this.ensureNotDisposed();
    this.data.set(key, value);

    const op: IDDSOperation = {
      opId: generateOpId(),
      type: "set",
      key,
      value,
      timestamp: Date.now(),
    };
    this.pendingOps.push(op);
    this.emit("changed", op);
  }

  delete(key: string): boolean {
    this.ensureNotDisposed();
    const existed = this.data.delete(key);
    if (existed) {
      const op: IDDSOperation = {
        opId: generateOpId(),
        type: "delete",
        key,
        timestamp: Date.now(),
      };
      this.pendingOps.push(op);
      this.emit("changed", op);
    }
    return existed;
  }

  has(key: string): boolean {
    this.ensureNotDisposed();
    return this.data.has(key);
  }

  keys(): string[] {
    this.ensureNotDisposed();
    return Array.from(this.data.keys());
  }

  size(): number {
    this.ensureNotDisposed();
    return this.data.size;
  }

  clear(): void {
    this.ensureNotDisposed();
    if (this.data.size === 0) return;
    this.data.clear();

    const op: IDDSOperation = {
      opId: generateOpId(),
      type: "clear",
      timestamp: Date.now(),
    };
    this.pendingOps.push(op);
    this.emit("changed", op);
  }

  // ---------- Event System ----------

  on(event: DDSEventType, handler: DDSChangeHandler): void {
    this.ensureNotDisposed();
    if (event === "changed") {
      this.handlers.add(handler);
    }
  }

  off(event: DDSEventType, handler: DDSChangeHandler): void {
    if (event === "changed") {
      this.handlers.delete(handler);
    }
  }

  // ---------- Remote Operation Application ----------

  /**
   * Apply a remote operation from another client.
   * This modifies the local data without generating a new pending op.
   */
  applyOp(operation: IDDSOperation): void {
    this.ensureNotDisposed();
    switch (operation.type) {
      case "set":
        if (operation.key !== undefined) {
          this.data.set(operation.key, operation.value);
        }
        break;
      case "delete":
        if (operation.key !== undefined) {
          this.data.delete(operation.key);
        }
        break;
      case "clear":
        this.data.clear();
        break;
    }
    // Notify local subscribers about the remote change
    this.emit("changed", operation);
  }

  // ---------- Pending Ops ----------

  /** Drain and return all pending operations */
  drainPendingOps(): IDDSOperation[] {
    const ops = this.pendingOps;
    this.pendingOps = [];
    return ops;
  }

  // ---------- Binary Serialization ----------

  /** Serialize this SharedMap to a compact binary format */
  toBinary(): Uint8Array {
    const writer = new BinaryWriter();

    // Header: DDS id + type
    writer.writeString(this.id);
    writer.writeString(this.type);

    // Entry count
    const entries = Array.from(this.data.entries());
    writer.writeVarInt(entries.length);

    // Entries: key (string) + value (tagged)
    for (const [key, value] of entries) {
      writer.writeString(key);
      encodeValue(writer, value);
    }

    return writer.toUint8Array();
  }

  /** Reconstruct a SharedMap from binary data (the DDS-specific payload portion) */
  static fromBinary(bytes: Uint8Array): SharedMap {
    const reader = new BinaryReader(bytes);

    const id = reader.readString();
    // Skip type — we know it's SharedMap
    reader.readString();

    const map = new SharedMap(id);
    const count = reader.readVarInt();

    for (let i = 0; i < count; i++) {
      const key = reader.readString();
      const value = decodeValue(reader);
      map.data.set(key, value);
    }

    return map;
  }

  // ---------- Disposal ----------

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.data.clear();
    this.handlers.clear();
    this.pendingOps = [];
  }

  // ---------- Internal ----------

  private emit(_event: DDSEventType, operation: IDDSOperation): void {
    for (const handler of this.handlers) {
      handler(operation);
    }
  }

  private ensureNotDisposed(): void {
    if (this._disposed) {
      throw new ContainerDisposedError();
    }
  }
}
