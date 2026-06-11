import { SharedTree } from "../../src/container/sharedTree";
import { ContainerDisposedError } from "../../src/container/errors";
import type { IDDSOperation, ITreeNode } from "../../src/container/types";

describe("SharedTree", () => {
  let tree: SharedTree;

  beforeEach(() => {
    tree = new SharedTree("test-tree");
  });

  afterEach(() => {
    if (!tree.disposed) tree.dispose();
  });

  // ============================================================
  // Basic Properties
  // ============================================================

  describe("properties", () => {
    it("should have correct id and type", () => {
      expect(tree.id).toBe("test-tree");
      expect(tree.type).toBe("SharedTree");
      expect(tree.disposed).toBe(false);
    });

    it("should start with a root node of type object", () => {
      const root = tree.getRoot();
      expect(root.type).toBe("object");
      expect(root.parentId).toBeNull();
      expect(root.children).toEqual([]);
    });

    it("should report nodeCount including root", () => {
      expect(tree.nodeCount()).toBe(1); // root only
    });
  });

  // ============================================================
  // Tree CRUD
  // ============================================================

  describe("insertChild", () => {
    it("should insert a string child under root", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "hello");
      expect(tree.getNode(childId)).toBeDefined();
      expect(tree.getNode(childId)!.type).toBe("string");
      expect(tree.getNode(childId)!.value).toBe("hello");
      expect(tree.getNode(childId)!.parentId).toBe(root.nodeId);
      expect(tree.nodeCount()).toBe(2);
    });

    it("should insert a number child", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "number", 42);
      expect(tree.getNode(childId)!.value).toBe(42);
    });

    it("should insert a boolean child", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "boolean", true);
      expect(tree.getNode(childId)!.value).toBe(true);
    });

    it("should insert object and array nodes with null value", () => {
      const root = tree.getRoot();
      const objId = tree.insertChild(root.nodeId, 0, "object");
      const arrId = tree.insertChild(root.nodeId, 1, "array");
      expect(tree.getNode(objId)!.value).toBeNull();
      expect(tree.getNode(arrId)!.value).toBeNull();
    });

    it("should insert at correct index", () => {
      const root = tree.getRoot();
      const a = tree.insertChild(root.nodeId, 0, "string", "a");
      const b = tree.insertChild(root.nodeId, 1, "string", "b");
      const c = tree.insertChild(root.nodeId, 1, "string", "c"); // insert between a and b

      const updatedRoot = tree.getRoot();
      expect(updatedRoot.children[0]).toBe(a);
      expect(updatedRoot.children[1]).toBe(c);
      expect(updatedRoot.children[2]).toBe(b);
    });

    it("should clamp index to valid range", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 999, "string", "clamped");
      const updatedRoot = tree.getRoot();
      expect(updatedRoot.children[0]).toBe(childId);
    });

    it("should throw when inserting under a leaf node", () => {
      const root = tree.getRoot();
      const leafId = tree.insertChild(root.nodeId, 0, "string", "leaf");
      expect(() => tree.insertChild(leafId, 0, "string", "child")).toThrow();
    });

    it("should throw when parent does not exist", () => {
      expect(() => tree.insertChild("nonexistent", 0, "string", "x")).toThrow();
    });

    it("should support custom type nodes", () => {
      const root = tree.getRoot();
      const customId = tree.insertChild(root.nodeId, 0, "custom", { special: true });
      expect(tree.getNode(customId)!.type).toBe("custom");
      expect(tree.getNode(customId)!.value).toEqual({ special: true });
    });

    it("should support nested children", () => {
      const root = tree.getRoot();
      const objId = tree.insertChild(root.nodeId, 0, "object");
      const childId = tree.insertChild(objId, 0, "string", "nested");
      expect(tree.getNode(childId)!.parentId).toBe(objId);
      expect(tree.getNode(objId)!.children).toContain(childId);
    });
  });

  describe("deleteNode", () => {
    it("should delete a leaf node", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "to-delete");
      expect(tree.deleteNode(childId)).toBe(true);
      expect(tree.getNode(childId)).toBeUndefined();
      expect(tree.nodeCount()).toBe(1);
    });

    it("should delete a subtree", () => {
      const root = tree.getRoot();
      const parentId = tree.insertChild(root.nodeId, 0, "object");
      tree.insertChild(parentId, 0, "string", "child1");
      tree.insertChild(parentId, 1, "number", 2);
      expect(tree.nodeCount()).toBe(4);

      tree.deleteNode(parentId);
      expect(tree.nodeCount()).toBe(1); // only root
    });

    it("should remove deleted node from parent children", () => {
      const root = tree.getRoot();
      const a = tree.insertChild(root.nodeId, 0, "string", "a");
      const b = tree.insertChild(root.nodeId, 1, "string", "b");

      tree.deleteNode(a);
      expect(tree.getRoot().children).toEqual([b]);
    });

    it("should not delete the root node", () => {
      const root = tree.getRoot();
      expect(tree.deleteNode(root.nodeId)).toBe(false);
    });

    it("should return false for nonexistent node", () => {
      expect(tree.deleteNode("nonexistent")).toBe(false);
    });

    it("should not delete already deleted node", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "x");
      tree.deleteNode(childId);
      expect(tree.deleteNode(childId)).toBe(false);
    });
  });

  describe("moveNode", () => {
    it("should move a node to a new parent", () => {
      const root = tree.getRoot();
      const containerA = tree.insertChild(root.nodeId, 0, "object");
      const containerB = tree.insertChild(root.nodeId, 1, "object");
      const childId = tree.insertChild(containerA, 0, "string", "moveme");

      tree.moveNode(childId, containerB, 0);

      expect(tree.getNode(childId)!.parentId).toBe(containerB);
      expect(tree.getNode(containerA)!.children).not.toContain(childId);
      expect(tree.getNode(containerB)!.children).toContain(childId);
    });

    it("should not move root node", () => {
      const root = tree.getRoot();
      const objId = tree.insertChild(root.nodeId, 0, "object");
      expect(() => tree.moveNode(root.nodeId, objId, 0)).toThrow();
    });

    it("should prevent moving a node under its own descendants", () => {
      const root = tree.getRoot();
      const parent = tree.insertChild(root.nodeId, 0, "object");
      const child = tree.insertChild(parent, 0, "object");
      expect(() => tree.moveNode(parent, child, 0)).toThrow();
    });

    it("should throw for nonexistent node", () => {
      const root = tree.getRoot();
      expect(() => tree.moveNode("nonexistent", root.nodeId, 0)).toThrow();
    });

    it("should throw when moving to a leaf node", () => {
      const root = tree.getRoot();
      const leaf = tree.insertChild(root.nodeId, 0, "string", "leaf");
      const other = tree.insertChild(root.nodeId, 1, "string", "other");
      expect(() => tree.moveNode(other, leaf, 0)).toThrow();
    });
  });

  describe("setNodeValue", () => {
    it("should update a leaf node value", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "old");
      tree.setNodeValue(childId, "new");
      expect(tree.getNode(childId)!.value).toBe("new");
    });

    it("should change value type (string to number)", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "old");
      tree.setNodeValue(childId, 42);
      expect(tree.getNode(childId)!.value).toBe(42);
    });

    it("should throw when setting value on object node", () => {
      const root = tree.getRoot();
      const objId = tree.insertChild(root.nodeId, 0, "object");
      expect(() => tree.setNodeValue(objId, "val")).toThrow();
    });

    it("should throw when setting value on array node", () => {
      const root = tree.getRoot();
      const arrId = tree.insertChild(root.nodeId, 0, "array");
      expect(() => tree.setNodeValue(arrId, [])).toThrow();
    });

    it("should throw for nonexistent node", () => {
      expect(() => tree.setNodeValue("nonexistent", "x")).toThrow();
    });
  });

  // ============================================================
  // Query
  // ============================================================

  describe("toJSON", () => {
    it("should serialize an empty tree to empty object", () => {
      expect(tree.toJSON()).toEqual({});
    });

    it("should serialize a flat tree", () => {
      const root = tree.getRoot();
      const a = tree.insertChild(root.nodeId, 0, "string", "hello");
      tree.getNodeInternal(a)!.metadata.set("key", "name");
      const b = tree.insertChild(root.nodeId, 1, "number", 42);
      tree.getNodeInternal(b)!.metadata.set("key", "age");

      expect(tree.toJSON()).toEqual({ name: "hello", age: 42 });
    });

    it("should serialize nested objects", () => {
      const root = tree.getRoot();
      const objId = tree.insertChild(root.nodeId, 0, "object");
      tree.getNodeInternal(objId)!.metadata.set("key", "address");

      const streetId = tree.insertChild(objId, 0, "string", "123 Main St");
      tree.getNodeInternal(streetId)!.metadata.set("key", "street");

      expect(tree.toJSON()).toEqual({
        address: { street: "123 Main St" },
      });
    });

    it("should serialize arrays", () => {
      const root = tree.getRoot();
      const arrId = tree.insertChild(root.nodeId, 0, "array");
      tree.getNodeInternal(arrId)!.metadata.set("key", "items");

      tree.insertChild(arrId, 0, "string", "a");
      tree.insertChild(arrId, 1, "string", "b");
      tree.insertChild(arrId, 2, "string", "c");

      expect(tree.toJSON()).toEqual({
        items: ["a", "b", "c"],
      });
    });
  });

  // ============================================================
  // IDDSOperation compatibility (Map-like interface)
  // ============================================================

  describe("IDistributedDataStructure interface", () => {
    it("get() returns node by id", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "val");
      const result = tree.get(childId) as ITreeNode;
      expect(result.nodeId).toBe(childId);
    });

    it("set() throws — use insertChild instead", () => {
      expect(() => tree.set("key", "val")).toThrow();
    });

    it("delete() delegates to deleteNode", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "val");
      expect(tree.delete(childId)).toBe(true);
      expect(tree.has(childId)).toBe(false);
    });

    it("has() checks existence", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "val");
      expect(tree.has(childId)).toBe(true);
      expect(tree.has("nonexistent")).toBe(false);
    });

    it("keys() returns all active node IDs", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "val");
      const keys = tree.keys();
      expect(keys).toContain(root.nodeId);
      expect(keys).toContain(childId);
    });

    it("size() returns nodeCount", () => {
      const root = tree.getRoot();
      tree.insertChild(root.nodeId, 0, "string", "a");
      tree.insertChild(root.nodeId, 1, "string", "b");
      expect(tree.size()).toBe(3);
    });

    it("clear() removes all children of root", () => {
      const root = tree.getRoot();
      tree.insertChild(root.nodeId, 0, "string", "a");
      tree.insertChild(root.nodeId, 1, "string", "b");
      tree.clear();
      expect(tree.nodeCount()).toBe(1);
      expect(tree.getRoot().children).toEqual([]);
    });
  });

  // ============================================================
  // Event System
  // ============================================================

  describe("event system", () => {
    it("should emit changed event on insertChild", () => {
      const handler = jest.fn();
      tree.on("changed", handler);

      const root = tree.getRoot();
      tree.insertChild(root.nodeId, 0, "string", "val");

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "tree-insert" }),
      );
    });

    it("should emit changed event on deleteNode", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "val");
      const handler = jest.fn();
      tree.on("changed", handler);

      tree.deleteNode(childId);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "tree-delete" }),
      );
    });

    it("should emit changed event on moveNode", () => {
      const root = tree.getRoot();
      const objA = tree.insertChild(root.nodeId, 0, "object");
      const objB = tree.insertChild(root.nodeId, 1, "object");
      const childId = tree.insertChild(objA, 0, "string", "moveme");
      const handler = jest.fn();
      tree.on("changed", handler);

      tree.moveNode(childId, objB, 0);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "tree-move" }),
      );
    });

    it("should emit changed event on setNodeValue", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "old");
      const handler = jest.fn();
      tree.on("changed", handler);

      tree.setNodeValue(childId, "new");

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "tree-set-value" }),
      );
    });

    it("should not emit when delete returns false", () => {
      const handler = jest.fn();
      tree.on("changed", handler);
      tree.deleteNode("nonexistent");
      expect(handler).not.toHaveBeenCalled();
    });

    it("should unsubscribe with off()", () => {
      const handler = jest.fn();
      tree.on("changed", handler);
      tree.off("changed", handler);

      const root = tree.getRoot();
      tree.insertChild(root.nodeId, 0, "string", "val");
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // Transaction Support
  // ============================================================

  describe("transactions", () => {
    it("should begin and commit a transaction", () => {
      tree.beginTransaction();
      expect(tree.isTransactionActive()).toBe(true);

      const root = tree.getRoot();
      tree.insertChild(root.nodeId, 0, "string", "a");
      tree.insertChild(root.nodeId, 1, "number", 42);

      tree.commit();
      expect(tree.isTransactionActive()).toBe(false);
    });

    it("should emit a single tree-transaction op on commit", () => {
      const handler = jest.fn();
      tree.on("changed", handler);

      tree.beginTransaction();
      const root = tree.getRoot();
      tree.insertChild(root.nodeId, 0, "string", "a");
      tree.insertChild(root.nodeId, 1, "string", "b");
      tree.commit();

      // Each insert emits its own changed event, plus the commit emits a transaction op
      const txnOps = handler.mock.calls.filter(
        (call: IDDSOperation[]) => call[0].type === "tree-transaction",
      );
      expect(txnOps).toHaveLength(1);
      expect(txnOps[0][0].childOps).toHaveLength(2);
    });

    it("should rollback a transaction (discard pending ops)", () => {
      tree.beginTransaction();
      const root = tree.getRoot();
      tree.insertChild(root.nodeId, 0, "string", "will-be-committed");
      tree.rollback();
      expect(tree.isTransactionActive()).toBe(false);

      // The pending ops from the rolled-back transaction should not appear
      const pending = tree.drainPendingOps();
      // Only the insert ops that were emitted during the transaction remain as individual ops
      // (rollback discards the transaction buffer, but the ops were already emitted)
      const txnOps = pending.filter((op) => op.type === "tree-transaction");
      expect(txnOps).toHaveLength(0);
    });

    it("should support nested transactions", () => {
      tree.beginTransaction();
      const root = tree.getRoot();
      tree.insertChild(root.nodeId, 0, "string", "outer");

      tree.beginTransaction(); // nested
      tree.insertChild(root.nodeId, 1, "string", "inner");
      tree.commit(); // commits inner into outer

      expect(tree.isTransactionActive()).toBe(true); // outer still active

      tree.commit(); // commits outer with both ops

      const pending = tree.drainPendingOps();
      const txnOps = pending.filter((op) => op.type === "tree-transaction");
      expect(txnOps).toHaveLength(1);
    });

    it("should throw on commit without active transaction", () => {
      expect(() => tree.commit()).toThrow();
    });

    it("should throw on rollback without active transaction", () => {
      expect(() => tree.rollback()).toThrow();
    });
  });

  // ============================================================
  // Position Reference
  // ============================================================

  describe("PositionReference", () => {
    it("should create a valid reference", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "val");

      const ref = tree.createPositionReference(childId);
      expect(ref.isValid()).toBe(true);
      expect(ref.nodeId).toBe(childId);
    });

    it("should resolve to current parent and index", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "val");

      const ref = tree.createPositionReference(childId);
      const resolved = ref.resolve();
      expect(resolved).toBeDefined();
      expect(resolved!.parentId).toBe(root.nodeId);
      expect(resolved!.index).toBe(0);
    });

    it("should remain stable after siblings are inserted before", () => {
      const root = tree.getRoot();
      const a = tree.insertChild(root.nodeId, 0, "string", "a");
      const ref = tree.createPositionReference(a);

      // Insert another child before 'a'
      tree.insertChild(root.nodeId, 0, "string", "new-first");

      // The reference still resolves to 'a' by nodeId, but its index changed
      expect(ref.isValid()).toBe(true);
      const resolved = ref.resolve();
      expect(resolved!.index).toBe(1); // 'a' is now at index 1
    });

    it("should become invalid when the referenced node is deleted", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "val");
      const ref = tree.createPositionReference(childId);

      tree.deleteNode(childId);
      expect(ref.isValid()).toBe(false);
      expect(ref.resolve()).toBeUndefined();
    });

    it("should become invalid when parent is deleted", () => {
      const root = tree.getRoot();
      const parentId = tree.insertChild(root.nodeId, 0, "object");
      const childId = tree.insertChild(parentId, 0, "string", "val");
      const ref = tree.createPositionReference(childId);

      tree.deleteNode(parentId); // cascading delete
      expect(ref.isValid()).toBe(false);
    });

    it("should track node after move", () => {
      const root = tree.getRoot();
      const containerA = tree.insertChild(root.nodeId, 0, "object");
      const containerB = tree.insertChild(root.nodeId, 1, "object");
      const childId = tree.insertChild(containerA, 0, "string", "moveme");

      const ref = tree.createPositionReference(childId);
      tree.moveNode(childId, containerB, 0);

      expect(ref.isValid()).toBe(true);
      const resolved = ref.resolve();
      expect(resolved!.parentId).toBe(containerB);
      expect(resolved!.index).toBe(0);
    });

    it("should get the node via getNode()", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "val");
      const ref = tree.createPositionReference(childId);
      expect(ref.getNode()!.value).toBe("val");
    });

    it("should throw when creating reference for nonexistent node", () => {
      expect(() => tree.createPositionReference("nonexistent")).toThrow();
    });
  });

  // ============================================================
  // CRDT Conflict Resolution
  // ============================================================

  describe("CRDT conflict resolution", () => {
    it("should skip duplicate remote insert (same nodeId)", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "local");

      // Simulate remote client inserting the same node (concurrent op)
      tree.applyOp({
        opId: "remote-op-1",
        type: "tree-insert",
        nodeId: childId,
        parentId: root.nodeId,
        index: 0,
        nodeType: "string",
        value: "remote",
        timestamp: Date.now(),
      });

      // Local value should remain (no duplicate)
      expect(tree.getNode(childId)!.value).toBe("local");
    });

    it("should use nodeId tiebreaker for concurrent inserts at same index", () => {
      const root = tree.getRoot();

      // Simulate two remote inserts at index 0 with different nodeIds
      const nodeA = "aaa-node";
      const nodeB = "zzz-node";

      tree.applyOp({
        opId: "remote-op-a",
        type: "tree-insert",
        nodeId: nodeB,
        parentId: root.nodeId,
        index: 0,
        nodeType: "string",
        value: "B",
        timestamp: Date.now(),
      });

      tree.applyOp({
        opId: "remote-op-b",
        type: "tree-insert",
        nodeId: nodeA,
        parentId: root.nodeId,
        index: 0,
        nodeType: "string",
        value: "A",
        timestamp: Date.now(),
      });

      // nodeA ("aaa-node") should come before nodeB ("zzz-node") lexicographically
      const children = tree.getRoot().children;
      expect(children[0]).toBe(nodeA);
      expect(children[1]).toBe(nodeB);
    });

    it("should apply LWW for concurrent set-value", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "original");

      // Older remote op
      tree.applyOp({
        opId: "remote-op-old",
        type: "tree-set-value",
        nodeId: childId,
        value: "old-update",
        timestamp: Date.now() - 1000,
      });

      // Should not apply because timestamp is older
      expect(tree.getNode(childId)!.value).toBe("original");

      // Newer remote op
      tree.applyOp({
        opId: "remote-op-new",
        type: "tree-set-value",
        nodeId: childId,
        value: "new-update",
        timestamp: Date.now() + 1000,
      });

      expect(tree.getNode(childId)!.value).toBe("new-update");
    });

    it("should apply delete-wins over concurrent value update", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "val");

      // Delete the node
      tree.deleteNode(childId);

      // Remote value update arrives after delete
      tree.applyOp({
        opId: "remote-op",
        type: "tree-set-value",
        nodeId: childId,
        value: "too-late",
        timestamp: Date.now() + 1000,
      });

      // Delete wins — node remains deleted
      expect(tree.getNode(childId)).toBeUndefined();
    });

    it("should discard remote insert when parent is deleted", () => {
      const root = tree.getRoot();
      const parentId = tree.insertChild(root.nodeId, 0, "object");

      // Delete parent
      tree.deleteNode(parentId);

      // Remote insert under deleted parent
      tree.applyOp({
        opId: "remote-op",
        type: "tree-insert",
        nodeId: "orphan-node",
        parentId: parentId,
        index: 0,
        nodeType: "string",
        value: "orphan",
        timestamp: Date.now(),
      });

      // Insert should be discarded
      expect(tree.getNode("orphan-node")).toBeUndefined();
    });

    it("should handle concurrent moves with LWW", () => {
      const root = tree.getRoot();
      const containerA = tree.insertChild(root.nodeId, 0, "object");
      const containerB = tree.insertChild(root.nodeId, 1, "object");
      const childId = tree.insertChild(containerA, 0, "string", "moveme");

      // Remote move with future timestamp
      tree.applyOp({
        opId: "remote-move",
        type: "tree-move",
        nodeId: childId,
        parentId: containerB,
        index: 0,
        timestamp: Date.now() + 5000,
      });

      expect(tree.getNode(childId)!.parentId).toBe(containerB);
    });

    it("should ignore stale remote move", () => {
      const root = tree.getRoot();
      const containerA = tree.insertChild(root.nodeId, 0, "object");
      const containerB = tree.insertChild(root.nodeId, 1, "object");
      const childId = tree.insertChild(containerA, 0, "string", "moveme");

      // Local move (updates lastModified)
      tree.moveNode(childId, containerB, 0);

      // Stale remote move (older timestamp)
      tree.applyOp({
        opId: "remote-move",
        type: "tree-move",
        nodeId: childId,
        parentId: containerA,
        index: 0,
        timestamp: Date.now() - 5000,
      });

      // Should stay in containerB (local move was newer)
      expect(tree.getNode(childId)!.parentId).toBe(containerB);
    });
  });

  // ============================================================
  // Remote Operation Application
  // ============================================================

  describe("applyOp", () => {
    it("should apply a remote tree-insert", () => {
      const root = tree.getRoot();
      tree.applyOp({
        opId: "remote-1",
        type: "tree-insert",
        nodeId: "remote-child",
        parentId: root.nodeId,
        index: 0,
        nodeType: "string",
        value: "from-remote",
        timestamp: Date.now(),
      });

      expect(tree.getNode("remote-child")!.value).toBe("from-remote");
    });

    it("should apply a remote tree-delete", () => {
      const root = tree.getRoot();
      const childId = tree.insertChild(root.nodeId, 0, "string", "val");

      tree.applyOp({
        opId: "remote-2",
        type: "tree-delete",
        nodeId: childId,
        timestamp: Date.now(),
      });

      expect(tree.getNode(childId)).toBeUndefined();
    });

    it("should apply a remote tree-transaction", () => {
      const root = tree.getRoot();

      tree.applyOp({
        opId: "remote-txn",
        type: "tree-transaction",
        timestamp: Date.now(),
        childOps: [
          {
            opId: "txn-op-1",
            type: "tree-insert",
            nodeId: "txn-child-a",
            parentId: root.nodeId,
            index: 0,
            nodeType: "string",
            value: "a",
            timestamp: Date.now(),
          },
          {
            opId: "txn-op-2",
            type: "tree-insert",
            nodeId: "txn-child-b",
            parentId: root.nodeId,
            index: 1,
            nodeType: "number",
            value: 42,
            timestamp: Date.now(),
          },
        ],
      });

      expect(tree.getNode("txn-child-a")!.value).toBe("a");
      expect(tree.getNode("txn-child-b")!.value).toBe(42);
      expect(tree.nodeCount()).toBe(3); // root + 2 children
    });

    it("should emit changed event for remote ops", () => {
      const handler = jest.fn();
      tree.on("changed", handler);
      const root = tree.getRoot();

      tree.applyOp({
        opId: "remote-emit",
        type: "tree-insert",
        nodeId: "emit-test",
        parentId: root.nodeId,
        index: 0,
        nodeType: "string",
        value: "test",
        timestamp: Date.now(),
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // CRDT Convergence
  // ============================================================

  describe("CRDT convergence", () => {
    it("two clients applying same ops in different order should converge", () => {
      // Create two independent trees
      const tree1 = new SharedTree("tree-1");
      const tree2 = new SharedTree("tree-2");

      // Use each tree's own root as the parent (simulating fork from same state)
      const root1 = tree1.getRoot().nodeId;
      const root2 = tree2.getRoot().nodeId;

      const ops1: IDDSOperation[] = [
        {
          opId: "op-a",
          type: "tree-insert",
          nodeId: "node-a",
          parentId: root1,
          index: 0,
          nodeType: "string",
          value: "A",
          timestamp: 1000,
        },
        {
          opId: "op-b",
          type: "tree-insert",
          nodeId: "node-b",
          parentId: root1,
          index: 0,
          nodeType: "string",
          value: "B",
          timestamp: 2000,
        },
      ];

      // Mirror ops for tree2 (same nodeIds, different parentId)
      const ops2: IDDSOperation[] = [
        { ...ops1[0], parentId: root2 },
        { ...ops1[1], parentId: root2 },
      ];

      // tree1: apply op-a then op-b
      tree1.applyOp(ops1[0]);
      tree1.applyOp(ops1[1]);

      // tree2: apply op-b then op-a (reverse order)
      tree2.applyOp(ops2[1]);
      tree2.applyOp(ops2[0]);

      // Both should have the same children ordering (deterministic by nodeId)
      const children1 = tree1.getRoot().children;
      const children2 = tree2.getRoot().children;
      expect(children1).toEqual(children2);

      // Both should have node-a before node-b (lexicographic tiebreaker)
      expect(children1).toEqual(["node-a", "node-b"]);

      tree1.dispose();
      tree2.dispose();
    });
  });

  // ============================================================
  // Binary Serialization
  // ============================================================

  describe("binary serialization", () => {
    it("should round-trip an empty tree", () => {
      const binary = tree.toBinary();
      const restored = SharedTree.fromBinary(binary);
      expect(restored.id).toBe("test-tree");
      expect(restored.nodeCount()).toBe(1);
      expect(restored.getRoot().type).toBe("object");
      restored.dispose();
    });

    it("should round-trip a tree with various node types", () => {
      const root = tree.getRoot();
      tree.insertChild(root.nodeId, 0, "string", "hello");
      tree.insertChild(root.nodeId, 1, "number", 42.5);
      tree.insertChild(root.nodeId, 2, "boolean", true);

      const objId = tree.insertChild(root.nodeId, 3, "object");
      tree.insertChild(objId, 0, "string", "nested");

      const binary = tree.toBinary();
      const restored = SharedTree.fromBinary(binary);

      expect(restored.nodeCount()).toBe(6);
      const restoredRoot = restored.getRoot();
      expect(restoredRoot.children.length).toBe(4);

      const strNode = restored.getNode(restoredRoot.children[0])!;
      expect(strNode.type).toBe("string");
      expect(strNode.value).toBe("hello");

      const numNode = restored.getNode(restoredRoot.children[1])!;
      expect(numNode.value).toBe(42.5);

      const boolNode = restored.getNode(restoredRoot.children[2])!;
      expect(boolNode.value).toBe(true);

      const objNode = restored.getNode(restoredRoot.children[3])!;
      expect(objNode.type).toBe("object");
      expect(objNode.children.length).toBe(1);

      restored.dispose();
    });

    it("should preserve parent-child relationships", () => {
      const root = tree.getRoot();
      const parentId = tree.insertChild(root.nodeId, 0, "object");
      const childId = tree.insertChild(parentId, 0, "string", "child");

      const binary = tree.toBinary();
      const restored = SharedTree.fromBinary(binary);

      const restoredRoot = restored.getRoot();
      const restoredParent = restored.getNode(restoredRoot.children[0])!;
      expect(restoredParent.nodeId).toBe(parentId);
      expect(restoredParent.parentId).toBe(restoredRoot.nodeId);

      const restoredChild = restored.getNode(restoredParent.children[0])!;
      expect(restoredChild.nodeId).toBe(childId);
      expect(restoredChild.parentId).toBe(parentId);
      expect(restoredChild.value).toBe("child");

      restored.dispose();
    });
  });

  // ============================================================
  // Pending Ops
  // ============================================================

  describe("pending ops", () => {
    it("should collect and drain pending ops", () => {
      const root = tree.getRoot();
      tree.insertChild(root.nodeId, 0, "string", "a");
      tree.insertChild(root.nodeId, 1, "string", "b");
      tree.deleteNode(tree.getRoot().children[0]);

      const ops = tree.drainPendingOps();
      expect(ops).toHaveLength(3);
      expect(ops[0].type).toBe("tree-insert");
      expect(ops[1].type).toBe("tree-insert");
      expect(ops[2].type).toBe("tree-delete");
    });

    it("should clear pending ops after drain", () => {
      const root = tree.getRoot();
      tree.insertChild(root.nodeId, 0, "string", "a");
      tree.drainPendingOps();
      expect(tree.drainPendingOps()).toHaveLength(0);
    });
  });

  // ============================================================
  // Disposal
  // ============================================================

  describe("disposal", () => {
    it("should mark as disposed", () => {
      tree.dispose();
      expect(tree.disposed).toBe(true);
    });

    it("should throw on operations after disposal", () => {
      tree.dispose();
      expect(() => tree.getRoot()).toThrow(ContainerDisposedError);
      expect(() => tree.getNode("x")).toThrow(ContainerDisposedError);
      expect(() => tree.insertChild("x", 0, "string")).toThrow(ContainerDisposedError);
      expect(() => tree.deleteNode("x")).toThrow(ContainerDisposedError);
      expect(() => tree.toJSON()).toThrow(ContainerDisposedError);
    });

    it("should be idempotent", () => {
      tree.dispose();
      expect(() => tree.dispose()).not.toThrow();
    });
  });
});
