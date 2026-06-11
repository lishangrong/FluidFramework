import { SharedMap } from "../../src/container/dds";
import { ContainerDisposedError } from "../../src/container/errors";

describe("SharedMap", () => {
  let map: SharedMap;

  beforeEach(() => {
    map = new SharedMap("test-map");
  });

  afterEach(() => {
    if (!map.disposed) map.dispose();
  });

  // ---------- Properties ----------

  it("should have correct id and type", () => {
    expect(map.id).toBe("test-map");
    expect(map.type).toBe("SharedMap");
    expect(map.disposed).toBe(false);
  });

  // ---------- CRUD Operations ----------

  describe("CRUD operations", () => {
    it("should set and get values", () => {
      map.set("name", "Alice");
      map.set("age", 30);
      expect(map.get("name")).toBe("Alice");
      expect(map.get("age")).toBe(30);
    });

    it("should return undefined for missing keys", () => {
      expect(map.get("nonexistent")).toBeUndefined();
    });

    it("should report has() correctly", () => {
      map.set("key", "value");
      expect(map.has("key")).toBe(true);
      expect(map.has("other")).toBe(false);
    });

    it("should delete entries and return whether they existed", () => {
      map.set("key", "value");
      expect(map.delete("key")).toBe(true);
      expect(map.has("key")).toBe(false);
      expect(map.delete("key")).toBe(false);
    });

    it("should list all keys", () => {
      map.set("a", 1);
      map.set("b", 2);
      map.set("c", 3);
      expect(map.keys().sort()).toEqual(["a", "b", "c"]);
    });

    it("should report size correctly", () => {
      expect(map.size()).toBe(0);
      map.set("a", 1);
      map.set("b", 2);
      expect(map.size()).toBe(2);
    });

    it("should clear all entries", () => {
      map.set("a", 1);
      map.set("b", 2);
      map.clear();
      expect(map.size()).toBe(0);
      expect(map.keys()).toEqual([]);
    });

    it("should handle various value types", () => {
      map.set("string", "hello");
      map.set("number", 42);
      map.set("boolean", true);
      map.set("null", null);
      map.set("object", { nested: { value: [1, 2, 3] } });

      expect(map.get("string")).toBe("hello");
      expect(map.get("number")).toBe(42);
      expect(map.get("boolean")).toBe(true);
      expect(map.get("null")).toBe(null);
      expect(map.get("object")).toEqual({ nested: { value: [1, 2, 3] } });
    });
  });

  // ---------- Event System ----------

  describe("event system", () => {
    it("should emit changed event on set", () => {
      const handler = jest.fn();
      map.on("changed", handler);

      map.set("key", "value");

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "set",
          key: "key",
          value: "value",
        }),
      );
    });

    it("should emit changed event on delete", () => {
      map.set("key", "value");
      const handler = jest.fn();
      map.on("changed", handler);

      map.delete("key");

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "delete",
          key: "key",
        }),
      );
    });

    it("should not emit on delete of nonexistent key", () => {
      const handler = jest.fn();
      map.on("changed", handler);
      map.delete("nonexistent");
      expect(handler).not.toHaveBeenCalled();
    });

    it("should emit changed event on clear", () => {
      map.set("a", 1);
      map.set("b", 2);
      const handler = jest.fn();
      map.on("changed", handler);

      map.clear();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: "clear" }),
      );
    });

    it("should not emit on clear of empty map", () => {
      const handler = jest.fn();
      map.on("changed", handler);
      map.clear();
      expect(handler).not.toHaveBeenCalled();
    });

    it("should unsubscribe with off()", () => {
      const handler = jest.fn();
      map.on("changed", handler);
      map.off("changed", handler);

      map.set("key", "value");
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ---------- Remote Operation Application ----------

  describe("applyOp", () => {
    it("should apply a remote set operation", () => {
      map.applyOp({
        opId: "remote-op-1",
        type: "set",
        key: "remote-key",
        value: "remote-value",
        timestamp: Date.now(),
      });

      expect(map.get("remote-key")).toBe("remote-value");
    });

    it("should apply a remote delete operation", () => {
      map.set("key", "value");
      map.applyOp({
        opId: "remote-op-2",
        type: "delete",
        key: "key",
        timestamp: Date.now(),
      });

      expect(map.has("key")).toBe(false);
    });

    it("should apply a remote clear operation", () => {
      map.set("a", 1);
      map.set("b", 2);
      map.applyOp({
        opId: "remote-op-3",
        type: "clear",
        timestamp: Date.now(),
      });

      expect(map.size()).toBe(0);
    });

    it("should emit changed event for remote operations", () => {
      const handler = jest.fn();
      map.on("changed", handler);

      map.applyOp({
        opId: "remote-op-4",
        type: "set",
        key: "key",
        value: "value",
        timestamp: Date.now(),
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  // ---------- Binary Serialization ----------

  describe("binary serialization", () => {
    it("should round-trip empty map", () => {
      const binary = map.toBinary();
      const restored = SharedMap.fromBinary(binary);
      expect(restored.id).toBe("test-map");
      expect(restored.size()).toBe(0);
      restored.dispose();
    });

    it("should round-trip map with various value types", () => {
      map.set("string", "hello");
      map.set("number", 42.5);
      map.set("boolean", false);
      map.set("null", null);
      map.set("object", { a: 1, b: [2, 3] });

      const binary = map.toBinary();
      const restored = SharedMap.fromBinary(binary);

      expect(restored.get("string")).toBe("hello");
      expect(restored.get("number")).toBe(42.5);
      expect(restored.get("boolean")).toBe(false);
      expect(restored.get("null")).toBe(null);
      expect(restored.get("object")).toEqual({ a: 1, b: [2, 3] });
      restored.dispose();
    });

    it("should handle special characters in keys", () => {
      map.set("key with spaces", 1);
      map.set("unicode-\u4e16\u754c", 2);
      map.set("", 3); // empty key

      const binary = map.toBinary();
      const restored = SharedMap.fromBinary(binary);

      expect(restored.get("key with spaces")).toBe(1);
      expect(restored.get("unicode-\u4e16\u754c")).toBe(2);
      expect(restored.get("")).toBe(3);
      restored.dispose();
    });
  });

  // ---------- Disposal ----------

  describe("disposal", () => {
    it("should mark as disposed", () => {
      map.dispose();
      expect(map.disposed).toBe(true);
    });

    it("should throw on operations after disposal", () => {
      map.dispose();
      expect(() => map.get("key")).toThrow(ContainerDisposedError);
      expect(() => map.set("key", "val")).toThrow(ContainerDisposedError);
      expect(() => map.delete("key")).toThrow(ContainerDisposedError);
      expect(() => map.keys()).toThrow(ContainerDisposedError);
      expect(() => map.size()).toThrow(ContainerDisposedError);
    });

    it("should be idempotent", () => {
      map.dispose();
      expect(() => map.dispose()).not.toThrow();
    });
  });

  // ---------- Pending Ops ----------

  describe("pending ops", () => {
    it("should collect and drain pending ops", () => {
      map.set("a", 1);
      map.set("b", 2);
      map.delete("a");

      const ops = map.drainPendingOps();
      expect(ops).toHaveLength(3);
      expect(ops[0].type).toBe("set");
      expect(ops[1].type).toBe("set");
      expect(ops[2].type).toBe("delete");
    });

    it("should clear pending ops after drain", () => {
      map.set("a", 1);
      map.drainPendingOps();
      expect(map.drainPendingOps()).toHaveLength(0);
    });
  });
});
