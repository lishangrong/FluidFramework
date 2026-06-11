import { FluidContainer } from "../../src/container/container";
import { SharedMap } from "../../src/container/dds";
import {
  ContainerDisposedError,
  DDSAlreadyExistsError,
  DDSNotFoundError,
  DynamicTypeNotAllowedError,
  SchemaValidationError,
  SnapshotError,
} from "../../src/container/errors";
import type { ContainerSchema } from "../../src/container/types";

// ---------- Helpers ----------

function makeSchema(overrides?: Partial<ContainerSchema>): ContainerSchema {
  return {
    initialObjects: {
      config: "SharedMap",
      users: "SharedMap",
    },
    dynamicObjectTypes: ["SharedMap"],
    ...overrides,
  };
}

// ============================================================
// Schema Validation
// ============================================================

describe("FluidContainer - Schema Validation", () => {
  it("should accept a valid schema", () => {
    expect(() => new FluidContainer(makeSchema())).not.toThrow();
  });

  it("should reject null schema", () => {
    expect(() => new FluidContainer(null as any)).toThrow(SchemaValidationError);
  });

  it("should reject missing initialObjects", () => {
    expect(() => new FluidContainer({ dynamicObjectTypes: [] } as any)).toThrow(
      SchemaValidationError,
    );
  });

  it("should reject missing dynamicObjectTypes", () => {
    expect(
      () => new FluidContainer({ initialObjects: {} } as any),
    ).toThrow(SchemaValidationError);
  });

  it("should reject unknown DDS types in initialObjects", () => {
    expect(
      () =>
        new FluidContainer({
          initialObjects: { data: "UnknownType" },
          dynamicObjectTypes: [],
        }),
    ).toThrow(SchemaValidationError);
  });

  it("should reject unknown DDS types in dynamicObjectTypes", () => {
    expect(
      () =>
        new FluidContainer({
          initialObjects: {},
          dynamicObjectTypes: ["UnknownType"],
        }),
    ).toThrow(SchemaValidationError);
  });
});

// ============================================================
// Initialization & Lifecycle
// ============================================================

describe("FluidContainer - Initialization & Lifecycle", () => {
  let container: FluidContainer;

  beforeEach(() => {
    container = new FluidContainer(makeSchema());
  });

  afterEach(() => {
    if (!container.disposed) container.dispose();
  });

  it("should create initial objects on initialize()", () => {
    container.initialize();
    expect(container.listDDS().sort()).toEqual(["config", "users"]);
    expect(container.getDDS("config")).toBeDefined();
    expect(container.getDDS("users")).toBeDefined();
  });

  it("should fire onCreate event on initialize()", () => {
    const handler = jest.fn();
    container.on("onCreate", handler);
    container.initialize();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should fire onLoad event on load()", () => {
    container.initialize();
    const snap = container.snapshot();

    const container2 = new FluidContainer(makeSchema());
    const handler = jest.fn();
    container2.on("onLoad", handler);
    container2.load(snap);
    expect(handler).toHaveBeenCalledTimes(1);
    container2.dispose();
  });

  it("should fire onDispose event on dispose()", () => {
    const handler = jest.fn();
    container.on("onDispose", handler);
    container.dispose();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should unsubscribe lifecycle handlers with off()", () => {
    const handler = jest.fn();
    container.on("onCreate", handler);
    container.off("onCreate", handler);
    container.initialize();
    expect(handler).not.toHaveBeenCalled();
  });
});

// ============================================================
// DDS Management
// ============================================================

describe("FluidContainer - DDS Management", () => {
  let container: FluidContainer;

  beforeEach(() => {
    container = new FluidContainer(makeSchema());
    container.initialize();
  });

  afterEach(() => {
    if (!container.disposed) container.dispose();
  });

  it("should get existing DDS by id", () => {
    const dds = container.getDDS("config");
    expect(dds).toBeDefined();
    expect(dds.id).toBe("config");
    expect(dds.type).toBe("SharedMap");
  });

  it("should throw DDSNotFoundError for unknown id", () => {
    expect(() => container.getDDS("nonexistent")).toThrow(DDSNotFoundError);
  });

  it("should dynamically create DDS with allowed type", () => {
    const dds = container.createDDS("dynamic-map", "SharedMap");
    expect(dds).toBeDefined();
    expect(dds.id).toBe("dynamic-map");
    expect(container.getDDS("dynamic-map")).toBe(dds);
  });

  it("should reject dynamic creation of disallowed types", () => {
    expect(() => container.createDDS("counter", "SharedCounter")).toThrow(
      DynamicTypeNotAllowedError,
    );
  });

  it("should reject creating DDS with duplicate id", () => {
    expect(() => container.createDDS("config", "SharedMap")).toThrow(
      DDSAlreadyExistsError,
    );
  });

  it("should remove DDS", () => {
    expect(container.removeDDS("config")).toBe(true);
    expect(container.listDDS()).not.toContain("config");
    expect(() => container.getDDS("config")).toThrow(DDSNotFoundError);
  });

  it("should return false when removing nonexistent DDS", () => {
    expect(container.removeDDS("nonexistent")).toBe(false);
  });

  it("should list all DDS ids", () => {
    container.createDDS("extra", "SharedMap");
    expect(container.listDDS().sort()).toEqual(["config", "extra", "users"]);
  });
});

// ============================================================
// Snapshot & Restore
// ============================================================

describe("FluidContainer - Snapshot & Restore", () => {
  let container: FluidContainer;

  beforeEach(() => {
    container = new FluidContainer(makeSchema());
    container.initialize();
  });

  afterEach(() => {
    if (!container.disposed) container.dispose();
  });

  it("should snapshot and return Uint8Array", () => {
    const snap = container.snapshot();
    expect(snap).toBeInstanceOf(Uint8Array);
    expect(snap.length).toBeGreaterThan(0);
  });

  it("should restore from snapshot preserving DDS state", () => {
    const configDDS = container.getDDS("config") as SharedMap;
    configDDS.set("theme", "dark");
    configDDS.set("lang", "zh");

    const usersDDS = container.getDDS("users") as SharedMap;
    usersDDS.set("alice", { role: "admin" });

    const snap = container.snapshot();

    // Create a new container and restore
    const container2 = new FluidContainer(makeSchema());
    container2.restore(snap);

    const restoredConfig = container2.getDDS("config") as SharedMap;
    expect(restoredConfig.get("theme")).toBe("dark");
    expect(restoredConfig.get("lang")).toBe("zh");

    const restoredUsers = container2.getDDS("users") as SharedMap;
    expect(restoredUsers.get("alice")).toEqual({ role: "admin" });

    container2.dispose();
  });

  it("should load() from snapshot and fire onLoad", () => {
    const dds = container.getDDS("config") as SharedMap;
    dds.set("key", "value");
    const snap = container.snapshot();

    const container2 = new FluidContainer(makeSchema());
    const handler = jest.fn();
    container2.on("onLoad", handler);
    container2.load(snap);

    expect(handler).toHaveBeenCalledTimes(1);
    const restored = container2.getDDS("config") as SharedMap;
    expect(restored.get("key")).toBe("value");
    container2.dispose();
  });

  it("should throw on invalid snapshot data", () => {
    const badData = new Uint8Array([0, 0, 0]);
    expect(() => container.restore(badData)).toThrow(SnapshotError);
  });

  it("should handle snapshot of empty container (no initial objects)", () => {
    const emptyContainer = new FluidContainer({
      initialObjects: {},
      dynamicObjectTypes: ["SharedMap"],
    });
    emptyContainer.initialize();

    const snap = emptyContainer.snapshot();
    expect(snap).toBeInstanceOf(Uint8Array);

    const container2 = new FluidContainer({
      initialObjects: {},
      dynamicObjectTypes: ["SharedMap"],
    });
    container2.restore(snap);
    expect(container2.listDDS()).toEqual([]);

    emptyContainer.dispose();
    container2.dispose();
  });
});

// ============================================================
// Pending Operations
// ============================================================

describe("FluidContainer - Pending Operations", () => {
  let container: FluidContainer;

  beforeEach(() => {
    container = new FluidContainer(makeSchema());
    container.initialize();
  });

  afterEach(() => {
    if (!container.disposed) container.dispose();
  });

  it("should collect ops from DDS mutations", () => {
    const dds = container.getDDS("config") as SharedMap;
    dds.set("a", 1);
    dds.set("b", 2);

    const ops = container.getPendingOps();
    expect(ops.length).toBeGreaterThanOrEqual(2);
    expect(ops[0].type).toBe("set");
  });

  it("should drain pending ops after retrieval", () => {
    const dds = container.getDDS("config") as SharedMap;
    dds.set("a", 1);
    container.getPendingOps(); // drain

    const ops2 = container.getPendingOps();
    expect(ops2).toHaveLength(0);
  });
});

// ============================================================
// Disposal
// ============================================================

describe("FluidContainer - Disposal", () => {
  it("should mark as disposed", () => {
    const container = new FluidContainer(makeSchema());
    container.initialize();
    container.dispose();
    expect(container.disposed).toBe(true);
  });

  it("should throw on operations after disposal", () => {
    const container = new FluidContainer(makeSchema());
    container.initialize();
    container.dispose();

    expect(() => container.getDDS("config")).toThrow(ContainerDisposedError);
    expect(() => container.createDDS("x", "SharedMap")).toThrow(ContainerDisposedError);
    expect(() => container.listDDS()).toThrow(ContainerDisposedError);
    expect(() => container.snapshot()).toThrow(ContainerDisposedError);
    expect(() => container.getPendingOps()).toThrow(ContainerDisposedError);
  });

  it("should be idempotent", () => {
    const container = new FluidContainer(makeSchema());
    container.dispose();
    expect(() => container.dispose()).not.toThrow();
  });

  it("should dispose all DDS instances", () => {
    const container = new FluidContainer(makeSchema());
    container.initialize();

    const configDDS = container.getDDS("config");
    const usersDDS = container.getDDS("users");

    container.dispose();

    expect(configDDS.disposed).toBe(true);
    expect(usersDDS.disposed).toBe(true);
  });
});
