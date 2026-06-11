/**
 * Fluid Container - SharedTree DDS Implementation
 *
 * A distributed tree data structure providing JSON-like hierarchical
 * collaborative editing with CRDT-based conflict resolution, transactional
 * updates, and stable position references.
 *
 * CRDT Strategy:
 * - Unique node IDs for conflict-free identification
 * - LWW (Last-Writer-Wins) for concurrent value updates
 * - Deterministic child ordering (nodeId tiebreaker for concurrent inserts)
 * - Tombstone-based deletion (delete wins over concurrent updates)
 */

import { BinaryReader, BinaryWriter } from "./binaryCodec";
import { ContainerDisposedError } from "./errors";
import type {
  DDSChangeHandler,
  DDSEventType,
  IDDSOperation,
  IDistributedDataStructure,
  ITreeNode,
  TreeNodeType,
} from "./types";

// ============================================================
// ID Generation
// ============================================================

let nodeCounter = 0;

/** Generate a globally unique node ID */
function generateNodeId(): string {
  return `node-${Date.now()}-${++nodeCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

let treeOpCounter = 0;

/** Generate a unique operation ID for tree ops */
function generateTreeOpId(): string {
  return `tree-op-${Date.now()}-${++treeOpCounter}`;
}

// ============================================================
// Internal TreeNode
// ============================================================

/** Internal mutable tree node representation */
interface InternalTreeNode {
  nodeId: string;
  type: TreeNodeType;
  value: unknown;
  parentId: string | null;
  children: string[];
  metadata: Map<string, unknown>;
  /** Tombstone flag — node has been logically deleted */
  deleted: boolean;
  /** Lamport-style timestamp for LWW conflict resolution */
  lastModified: number;
}

function createInternalNode(
  nodeId: string,
  type: TreeNodeType,
  value: unknown,
  parentId: string | null,
): InternalTreeNode {
  return {
    nodeId,
    type,
    value,
    parentId,
    children: [],
    metadata: new Map(),
    deleted: false,
    lastModified: Date.now(),
  };
}

// ============================================================
// PositionReference
// ============================================================

/**
 * A stable reference to a position in the tree.
 *
 * Unlike raw indices, a PositionReference tracks a specific node by its
 * unique nodeId, so the reference remains valid even when surrounding
 * nodes are inserted or deleted.
 */
export class PositionReference {
  private readonly tree: SharedTree;
  private readonly _nodeId: string;

  constructor(tree: SharedTree, nodeId: string) {
    this.tree = tree;
    this._nodeId = nodeId;
  }

  /** The node ID this reference points to */
  get nodeId(): string {
    return this._nodeId;
  }

  /**
   * Resolve this reference to a concrete parent + index position.
   * Returns undefined if the referenced node no longer exists.
   */
  resolve(): { parentId: string; index: number } | undefined {
    const node = this.tree.getNodeInternal(this._nodeId);
    if (!node || node.deleted || node.parentId === null) {
      return undefined;
    }
    const parent = this.tree.getNodeInternal(node.parentId);
    if (!parent || parent.deleted) {
      return undefined;
    }
    const index = parent.children.indexOf(this._nodeId);
    if (index === -1) {
      return undefined;
    }
    return { parentId: parent.nodeId, index };
  }

  /** Whether the referenced node still exists and is not deleted */
  isValid(): boolean {
    const node = this.tree.getNodeInternal(this._nodeId);
    return node !== undefined && !node.deleted;
  }

  /** Get the current node this reference points to */
  getNode(): ITreeNode | undefined {
    return this.tree.getNode(this._nodeId);
  }
}

// ============================================================
// SharedTree Implementation
// ============================================================

/**
 * A distributed shared tree data structure.
 *
 * Supports:
 * - Hierarchical CRUD with JSON-like node types
 * - CRDT-based conflict resolution for concurrent edits
 * - Transactional updates (atomic multi-op commits)
 * - Stable position references
 * - Binary serialization for snapshots
 */
export class SharedTree implements IDistributedDataStructure {
  public readonly id: string;
  public readonly type = "SharedTree";

  /** All nodes keyed by nodeId (includes tombstoned nodes) */
  private nodes: Map<string, InternalTreeNode>;

  /** Root node ID */
  private rootNodeId: string;

  private handlers: Set<DDSChangeHandler>;
  private _disposed: boolean;
  private pendingOps: IDDSOperation[];

  // ---------- Transaction state ----------

  /** Stack of transaction buffers; empty = no active transaction */
  private transactionStack: IDDSOperation[][];

  constructor(id: string) {
    this.id = id;
    this.nodes = new Map();
    this.handlers = new Set();
    this._disposed = false;
    this.pendingOps = [];
    this.transactionStack = [];

    // Create the root node (always an "object" type)
    const rootId = generateNodeId();
    const root = createInternalNode(rootId, "object", null, null);
    this.nodes.set(rootId, root);
    this.rootNodeId = rootId;
  }

  // ---------- Properties ----------

  get disposed(): boolean {
    return this._disposed;
  }

  // ---------- Tree CRUD ----------

  /** Get the root node */
  getRoot(): ITreeNode {
    this.ensureNotDisposed();
    return this.toPublicNode(this.nodes.get(this.rootNodeId)!);
  }

  /** Get a node by its ID (returns undefined if not found or deleted) */
  getNode(nodeId: string): ITreeNode | undefined {
    this.ensureNotDisposed();
    const node = this.nodes.get(nodeId);
    if (!node || node.deleted) return undefined;
    return this.toPublicNode(node);
  }

  /** Internal node access (includes tombstoned nodes, used by PositionReference) */
  getNodeInternal(nodeId: string): InternalTreeNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Insert a new child node under the given parent.
   * @returns The new node's ID
   */
  insertChild(
    parentId: string,
    index: number,
    nodeType: TreeNodeType,
    value?: unknown,
  ): string {
    this.ensureNotDisposed();
    const parent = this.nodes.get(parentId);
    if (!parent || parent.deleted) {
      throw new Error(`Parent node "${parentId}" not found or deleted`);
    }
    if (parent.type !== "object" && parent.type !== "array") {
      throw new Error(`Cannot add children to a "${parent.type}" node`);
    }

    const nodeId = generateNodeId();
    const leafValue = nodeType === "object" || nodeType === "array" ? null : (value ?? null);
    const node = createInternalNode(nodeId, nodeType, leafValue, parentId);
    this.nodes.set(nodeId, node);

    // Insert at the specified index (clamp to valid range)
    const clampedIndex = Math.min(Math.max(0, index), parent.children.length);
    parent.children.splice(clampedIndex, 0, nodeId);

    const op = this.createTreeOp("tree-insert", {
      nodeId,
      parentId,
      index: clampedIndex,
      nodeType,
      value: leafValue,
    });

    this.recordOp(op);
    return nodeId;
  }

  /**
   * Delete a node and all its descendants.
   * Uses tombstone-based deletion for CRDT conflict resolution.
   */
  deleteNode(nodeId: string): boolean {
    this.ensureNotDisposed();
    const node = this.nodes.get(nodeId);
    if (!node || node.deleted || nodeId === this.rootNodeId) {
      return false;
    }

    // Tombstone this node and all descendants
    this.tombstoneSubtree(nodeId);

    // Remove from parent's children list
    if (node.parentId) {
      const parent = this.nodes.get(node.parentId);
      if (parent) {
        const idx = parent.children.indexOf(nodeId);
        if (idx !== -1) {
          parent.children.splice(idx, 1);
        }
      }
    }

    const op = this.createTreeOp("tree-delete", { nodeId });
    this.recordOp(op);
    return true;
  }

  /**
   * Move a node to a new parent at the given index.
   */
  moveNode(nodeId: string, newParentId: string, newIndex: number): void {
    this.ensureNotDisposed();
    const node = this.nodes.get(nodeId);
    if (!node || node.deleted) {
      throw new Error(`Node "${nodeId}" not found or deleted`);
    }
    if (nodeId === this.rootNodeId) {
      throw new Error("Cannot move the root node");
    }
    const newParent = this.nodes.get(newParentId);
    if (!newParent || newParent.deleted) {
      throw new Error(`New parent node "${newParentId}" not found or deleted`);
    }
    if (newParent.type !== "object" && newParent.type !== "array") {
      throw new Error(`Cannot add children to a "${newParent.type}" node`);
    }

    // Prevent moving a node under its own descendants
    if (this.isDescendant(nodeId, newParentId)) {
      throw new Error("Cannot move a node under its own descendants");
    }

    // Remove from old parent
    if (node.parentId) {
      const oldParent = this.nodes.get(node.parentId);
      if (oldParent) {
        const oldIdx = oldParent.children.indexOf(nodeId);
        if (oldIdx !== -1) {
          oldParent.children.splice(oldIdx, 1);
        }
      }
    }

    // Insert into new parent
    node.parentId = newParentId;
    node.lastModified = Date.now();
    const clampedIndex = Math.min(Math.max(0, newIndex), newParent.children.length);
    newParent.children.splice(clampedIndex, 0, nodeId);

    const op = this.createTreeOp("tree-move", {
      nodeId,
      parentId: newParentId,
      index: clampedIndex,
    });
    this.recordOp(op);
  }

  /**
   * Update the value of a node.
   */
  setNodeValue(nodeId: string, value: unknown): void {
    this.ensureNotDisposed();
    const node = this.nodes.get(nodeId);
    if (!node || node.deleted) {
      throw new Error(`Node "${nodeId}" not found or deleted`);
    }
    if (node.type === "object" || node.type === "array") {
      throw new Error(`Cannot set value on "${node.type}" nodes`);
    }

    node.value = value;
    node.lastModified = Date.now();

    const op = this.createTreeOp("tree-set-value", { nodeId, value });
    this.recordOp(op);
  }

  // ---------- Query ----------

  /** Convert the tree to a plain JSON-compatible object */
  toJSON(): unknown {
    this.ensureNotDisposed();
    return this.nodeToJSON(this.rootNodeId);
  }

  /** Count all non-deleted nodes (including root) */
  nodeCount(): number {
    this.ensureNotDisposed();
    let count = 0;
    for (const node of this.nodes.values()) {
      if (!node.deleted) count++;
    }
    return count;
  }

  // ---------- Transaction Support ----------

  /**
   * Begin a new transaction. All subsequent operations will be buffered
   * until commit() or rollback() is called.
   */
  beginTransaction(): void {
    this.ensureNotDisposed();
    this.transactionStack.push([]);
  }

  /**
   * Commit the current transaction. All buffered operations are applied
   * atomically and emitted as a single tree-transaction op.
   */
  commit(): void {
    this.ensureNotDisposed();
    if (this.transactionStack.length === 0) {
      throw new Error("No active transaction to commit");
    }

    const childOps = this.transactionStack.pop()!;
    if (childOps.length === 0) return; // empty transaction, nothing to emit

    const txnOp = this.createTreeOp("tree-transaction", {
      childOps,
    });

    // If there's an outer transaction, merge into it
    if (this.transactionStack.length > 0) {
      this.transactionStack[this.transactionStack.length - 1].push(txnOp);
    } else {
      this.pendingOps.push(txnOp);
      this.emit("changed", txnOp);
    }
  }

  /**
   * Rollback the current transaction, discarding all buffered operations.
   * Note: the local state changes are NOT reverted — only the pending ops are discarded.
   * For full rollback, restore from a snapshot taken before the transaction.
   */
  rollback(): void {
    this.ensureNotDisposed();
    if (this.transactionStack.length === 0) {
      throw new Error("No active transaction to rollback");
    }
    this.transactionStack.pop();
  }

  /** Whether a transaction is currently active */
  isTransactionActive(): boolean {
    return this.transactionStack.length > 0;
  }

  // ---------- Position Reference ----------

  /**
   * Create a stable reference to a node's position.
   * The reference remains valid even as surrounding nodes are inserted/deleted.
   */
  createPositionReference(nodeId: string): PositionReference {
    this.ensureNotDisposed();
    const node = this.nodes.get(nodeId);
    if (!node || node.deleted) {
      throw new Error(`Node "${nodeId}" not found or deleted`);
    }
    return new PositionReference(this, nodeId);
  }

  // ---------- IDDSOperation: get/set/delete/has/keys/size/clear ----------

  /**
   * Map-compatible get: delegates to tree node lookup by nodeId as key.
   */
  get(key: string): unknown {
    this.ensureNotDisposed();
    return this.getNode(key);
  }

  set(_key: string, _value: unknown): void {
    throw new Error("SharedTree does not support set(key, value). Use insertChild() or setNodeValue() instead.");
  }

  delete(key: string): boolean {
    this.ensureNotDisposed();
    return this.deleteNode(key);
  }

  has(key: string): boolean {
    this.ensureNotDisposed();
    const node = this.nodes.get(key);
    return node !== undefined && !node.deleted;
  }

  keys(): string[] {
    this.ensureNotDisposed();
    const result: string[] = [];
    for (const [id, node] of this.nodes) {
      if (!node.deleted) result.push(id);
    }
    return result;
  }

  size(): number {
    return this.nodeCount();
  }

  clear(): void {
    this.ensureNotDisposed();
    // Delete all children of root (not the root itself)
    const root = this.nodes.get(this.rootNodeId)!;
    const childIds = [...root.children];
    for (const childId of childIds) {
      this.deleteNode(childId);
    }
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
   * Handles CRDT conflict resolution for concurrent operations.
   */
  applyOp(operation: IDDSOperation): void {
    this.ensureNotDisposed();

    switch (operation.type) {
      case "tree-insert":
        this.applyRemoteInsert(operation);
        break;
      case "tree-delete":
        this.applyRemoteDelete(operation);
        break;
      case "tree-move":
        this.applyRemoteMove(operation);
        break;
      case "tree-set-value":
        this.applyRemoteSetValue(operation);
        break;
      case "tree-transaction":
        this.applyRemoteTransaction(operation);
        break;
    }

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

  /** Serialize this SharedTree to a compact binary format */
  toBinary(): Uint8Array {
    const writer = new BinaryWriter();

    // Header: DDS id + type
    writer.writeString(this.id);
    writer.writeString(this.type);

    // Root node ID
    writer.writeString(this.rootNodeId);

    // Collect all non-deleted nodes
    const allNodes: InternalTreeNode[] = [];
    for (const node of this.nodes.values()) {
      if (!node.deleted) {
        allNodes.push(node);
      }
    }

    writer.writeVarInt(allNodes.length);

    for (const node of allNodes) {
      writer.writeString(node.nodeId);
      writer.writeString(node.type);
      writer.writeString(node.parentId ?? "");
      writer.writeUint8(node.parentId === null ? 1 : 0); // isRoot flag

      // Value
      this.encodeNodeValue(writer, node.value);

      // Children
      writer.writeVarInt(node.children.length);
      for (const childId of node.children) {
        writer.writeString(childId);
      }

      // Metadata
      const metaEntries = Array.from(node.metadata.entries());
      writer.writeVarInt(metaEntries.length);
      for (const [key, val] of metaEntries) {
        writer.writeString(key);
        this.encodeNodeValue(writer, val);
      }

      // Timestamp
      writer.writeFloat64(node.lastModified);
    }

    return writer.toUint8Array();
  }

  /** Reconstruct a SharedTree from binary data */
  static fromBinary(bytes: Uint8Array): SharedTree {
    const reader = new BinaryReader(bytes);

    const id = reader.readString();
    // Skip type
    reader.readString();

    const tree = new SharedTree(id);
    // Remove the auto-generated root — we'll rebuild from binary
    tree.nodes.clear();

    const rootNodeId = reader.readString();
    tree.rootNodeId = rootNodeId;

    const nodeCount = reader.readVarInt();

    // First pass: create all nodes
    for (let i = 0; i < nodeCount; i++) {
      const nodeId = reader.readString();
      const type = reader.readString() as TreeNodeType;
      const parentIdStr = reader.readString();
      const isRoot = reader.readUint8() === 1;
      const parentId = isRoot ? null : parentIdStr;

      const value = SharedTree.decodeNodeValue(reader);

      const childrenCount = reader.readVarInt();
      const children: string[] = [];
      for (let j = 0; j < childrenCount; j++) {
        children.push(reader.readString());
      }

      const metaCount = reader.readVarInt();
      const metadata = new Map<string, unknown>();
      for (let j = 0; j < metaCount; j++) {
        const key = reader.readString();
        const val = SharedTree.decodeNodeValue(reader);
        metadata.set(key, val);
      }

      const lastModified = reader.readFloat64();

      const node: InternalTreeNode = {
        nodeId,
        type,
        value,
        parentId,
        children,
        metadata,
        deleted: false,
        lastModified,
      };

      tree.nodes.set(nodeId, node);
    }

    return tree;
  }

  // ---------- Disposal ----------

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.nodes.clear();
    this.handlers.clear();
    this.pendingOps = [];
    this.transactionStack = [];
  }

  // ============================================================
  // Internal: CRDT Conflict Resolution
  // ============================================================

  /**
   * Apply a remote insert with CRDT conflict resolution.
   * If a node with the same ID already exists (concurrent insert), skip.
   * If inserting at the same index as an existing node, use nodeId tiebreaker.
   */
  private applyRemoteInsert(op: IDDSOperation): void {
    const { nodeId, parentId, index, nodeType, value } = op;
    if (!nodeId || !parentId || !nodeType) return;

    // If node already exists (from local concurrent op), skip — no duplicate
    if (this.nodes.has(nodeId)) return;

    const parent = this.nodes.get(parentId);
    if (!parent || parent.deleted) return; // Parent was deleted — discard insert

    const node = createInternalNode(nodeId, nodeType as TreeNodeType, value ?? null, parentId);
    this.nodes.set(nodeId, node);

    // Determine actual insertion index with CRDT tiebreaker
    let insertIdx = Math.min(Math.max(0, index ?? 0), parent.children.length);

    // Tiebreaker: if there's already a child at this position from a concurrent insert,
    // the node with the lexicographically smaller nodeId goes first
    while (insertIdx < parent.children.length) {
      const existingChildId = parent.children[insertIdx];
      if (nodeId < existingChildId) {
        break; // Our node should come before the existing one
      }
      insertIdx++;
    }

    parent.children.splice(insertIdx, 0, nodeId);
  }

  /**
   * Apply a remote delete. Delete wins over concurrent updates.
   */
  private applyRemoteDelete(op: IDDSOperation): void {
    const { nodeId } = op;
    if (!nodeId) return;

    const node = this.nodes.get(nodeId);
    if (!node || node.deleted) return; // Already deleted

    this.tombstoneSubtree(nodeId);

    // Remove from parent's children list
    if (node.parentId) {
      const parent = this.nodes.get(node.parentId);
      if (parent) {
        const idx = parent.children.indexOf(nodeId);
        if (idx !== -1) {
          parent.children.splice(idx, 1);
        }
      }
    }
  }

  /**
   * Apply a remote move with LWW conflict resolution.
   */
  private applyRemoteMove(op: IDDSOperation): void {
    const { nodeId, parentId: newParentId, index } = op;
    if (!nodeId || newParentId === undefined) return;

    const node = this.nodes.get(nodeId);
    if (!node || node.deleted) return;

    const newParent = this.nodes.get(newParentId);
    if (!newParent || newParent.deleted) return;

    // LWW: only apply if this op is newer than the node's last modification
    const opTimestamp = op.timestamp ?? 0;
    if (opTimestamp < node.lastModified) return;

    // Remove from old parent
    if (node.parentId) {
      const oldParent = this.nodes.get(node.parentId);
      if (oldParent) {
        const oldIdx = oldParent.children.indexOf(nodeId);
        if (oldIdx !== -1) {
          oldParent.children.splice(oldIdx, 1);
        }
      }
    }

    // Insert into new parent
    node.parentId = newParentId;
    node.lastModified = opTimestamp;
    const clampedIndex = Math.min(Math.max(0, index ?? 0), newParent.children.length);
    newParent.children.splice(clampedIndex, 0, nodeId);
  }

  /**
   * Apply a remote set-value with LWW conflict resolution.
   */
  private applyRemoteSetValue(op: IDDSOperation): void {
    const { nodeId, value } = op;
    if (!nodeId) return;

    const node = this.nodes.get(nodeId);
    if (!node || node.deleted) return; // Delete wins over value update

    const opTimestamp = op.timestamp ?? 0;
    if (opTimestamp < node.lastModified) return; // LWW: newer wins

    node.value = value;
    node.lastModified = opTimestamp;
  }

  /**
   * Apply a remote transaction — apply all child ops atomically.
   */
  private applyRemoteTransaction(op: IDDSOperation): void {
    const { childOps } = op;
    if (!childOps) return;

    for (const childOp of childOps) {
      // Recursively apply, but skip the emit (we emit once for the txn)
      switch (childOp.type) {
        case "tree-insert":
          this.applyRemoteInsert(childOp);
          break;
        case "tree-delete":
          this.applyRemoteDelete(childOp);
          break;
        case "tree-move":
          this.applyRemoteMove(childOp);
          break;
        case "tree-set-value":
          this.applyRemoteSetValue(childOp);
          break;
        case "tree-transaction":
          this.applyRemoteTransaction(childOp);
          break;
      }
    }
  }

  // ============================================================
  // Internal Helpers
  // ============================================================

  /** Convert an internal node to the public read-only interface */
  private toPublicNode(node: InternalTreeNode): ITreeNode {
    return {
      nodeId: node.nodeId,
      type: node.type,
      value: node.value,
      parentId: node.parentId,
      children: [...node.children],
      metadata: new Map(node.metadata) as ReadonlyMap<string, unknown>,
    };
  }

  /** Recursively tombstone a node and all its descendants */
  private tombstoneSubtree(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    node.deleted = true;
    node.lastModified = Date.now();
    for (const childId of node.children) {
      this.tombstoneSubtree(childId);
    }
  }

  /** Check if `candidateId` is a descendant of `ancestorId` */
  private isDescendant(ancestorId: string, candidateId: string): boolean {
    let current = this.nodes.get(candidateId);
    while (current && current.parentId) {
      if (current.parentId === ancestorId) return true;
      current = this.nodes.get(current.parentId);
    }
    return false;
  }

  /** Convert a subtree to JSON */
  private nodeToJSON(nodeId: string): unknown {
    const node = this.nodes.get(nodeId);
    if (!node || node.deleted) return null;

    if (node.type === "object") {
      const obj: Record<string, unknown> = {};
      for (const childId of node.children) {
        const child = this.nodes.get(childId);
        if (child && !child.deleted) {
          // For object nodes, use metadata "key" or nodeId as property name
          const propName = (child.metadata.get("key") as string) ?? child.nodeId;
          obj[propName] = this.nodeToJSON(childId);
        }
      }
      return obj;
    }

    if (node.type === "array") {
      const arr: unknown[] = [];
      for (const childId of node.children) {
        arr.push(this.nodeToJSON(childId));
      }
      return arr;
    }

    // Leaf node
    return node.value;
  }

  /** Create a tree operation with standard fields */
  private createTreeOp(
    type: IDDSOperation["type"],
    fields: Partial<Omit<IDDSOperation, "opId" | "type" | "timestamp">>,
  ): IDDSOperation {
    return {
      opId: generateTreeOpId(),
      type,
      timestamp: Date.now(),
      ...fields,
    };
  }

  /** Record an operation — either buffer it in a transaction or push to pending */
  private recordOp(op: IDDSOperation): void {
    if (this.transactionStack.length > 0) {
      this.transactionStack[this.transactionStack.length - 1].push(op);
    } else {
      this.pendingOps.push(op);
    }
    this.emit("changed", op);
  }

  /** Encode a node value into binary */
  private encodeNodeValue(writer: BinaryWriter, value: unknown): void {
    if (value === null || value === undefined) {
      writer.writeUint8(0); // NULL
    } else if (typeof value === "boolean") {
      writer.writeUint8(1); // BOOLEAN
      writer.writeUint8(value ? 1 : 0);
    } else if (typeof value === "number") {
      writer.writeUint8(2); // NUMBER
      writer.writeFloat64(value);
    } else if (typeof value === "string") {
      writer.writeUint8(3); // STRING
      writer.writeString(value);
    } else {
      writer.writeUint8(4); // JSON
      writer.writeString(JSON.stringify(value));
    }
  }

  /** Decode a node value from binary */
  private static decodeNodeValue(reader: BinaryReader): unknown {
    const tag = reader.readUint8();
    switch (tag) {
      case 0: return null;
      case 1: return reader.readUint8() === 1;
      case 2: return reader.readFloat64();
      case 3: return reader.readString();
      case 4: return JSON.parse(reader.readString());
      default: throw new Error(`Unknown value type tag: ${tag}`);
    }
  }

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
