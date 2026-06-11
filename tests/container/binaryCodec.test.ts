import {
  BinaryWriter,
  BinaryReader,
  encodeSnapshot,
  decodeSnapshot,
} from "../../src/container/binaryCodec";
import { SnapshotError } from "../../src/container/errors";

describe("BinaryWriter / BinaryReader", () => {
  // ---------- Primitive Round-Trips ----------

  it("should round-trip Uint8 values", () => {
    const w = new BinaryWriter();
    w.writeUint8(0);
    w.writeUint8(127);
    w.writeUint8(255);

    const r = new BinaryReader(w.toUint8Array());
    expect(r.readUint8()).toBe(0);
    expect(r.readUint8()).toBe(127);
    expect(r.readUint8()).toBe(255);
  });

  it("should round-trip Uint16 values", () => {
    const w = new BinaryWriter();
    w.writeUint16(0);
    w.writeUint16(1234);
    w.writeUint16(65535);

    const r = new BinaryReader(w.toUint8Array());
    expect(r.readUint16()).toBe(0);
    expect(r.readUint16()).toBe(1234);
    expect(r.readUint16()).toBe(65535);
  });

  it("should round-trip Uint32 values", () => {
    const w = new BinaryWriter();
    w.writeUint32(0);
    w.writeUint32(123456);
    w.writeUint32(4294967295);

    const r = new BinaryReader(w.toUint8Array());
    expect(r.readUint32()).toBe(0);
    expect(r.readUint32()).toBe(123456);
    expect(r.readUint32()).toBe(4294967295);
  });

  it("should round-trip Float64 values", () => {
    const w = new BinaryWriter();
    w.writeFloat64(0);
    w.writeFloat64(3.141592653589793);
    w.writeFloat64(-1e100);

    const r = new BinaryReader(w.toUint8Array());
    expect(r.readFloat64()).toBe(0);
    expect(r.readFloat64()).toBe(3.141592653589793);
    expect(r.readFloat64()).toBe(-1e100);
  });

  // ---------- VarInt ----------

  describe("VarInt", () => {
    it("should encode small numbers in 1 byte", () => {
      const w = new BinaryWriter();
      w.writeVarInt(0);
      const bytes = w.toUint8Array();
      expect(bytes.length).toBe(1);

      const r = new BinaryReader(bytes);
      expect(r.readVarInt()).toBe(0);
    });

    it("should encode 127 in 1 byte", () => {
      const w = new BinaryWriter();
      w.writeVarInt(127);
      expect(w.toUint8Array().length).toBe(1);
    });

    it("should encode 128 in 2 bytes", () => {
      const w = new BinaryWriter();
      w.writeVarInt(128);
      expect(w.toUint8Array().length).toBe(2);
    });

    it("should round-trip various VarInt values", () => {
      const values = [0, 1, 127, 128, 255, 16383, 16384, 100000, 2097151, 2097152];
      const w = new BinaryWriter();
      for (const v of values) w.writeVarInt(v);

      const r = new BinaryReader(w.toUint8Array());
      for (const expected of values) {
        expect(r.readVarInt()).toBe(expected);
      }
    });
  });

  // ---------- String ----------

  describe("String", () => {
    it("should round-trip empty string", () => {
      const w = new BinaryWriter();
      w.writeString("");
      const r = new BinaryReader(w.toUint8Array());
      expect(r.readString()).toBe("");
    });

    it("should round-trip ASCII string", () => {
      const w = new BinaryWriter();
      w.writeString("hello world");
      const r = new BinaryReader(w.toUint8Array());
      expect(r.readString()).toBe("hello world");
    });

    it("should round-trip Unicode string", () => {
      const w = new BinaryWriter();
      w.writeString("\u4f60\u597d\u4e16\u754c");
      const r = new BinaryReader(w.toUint8Array());
      expect(r.readString()).toBe("\u4f60\u597d\u4e16\u754c");
    });
  });

  // ---------- Bytes ----------

  it("should round-trip raw bytes", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const w = new BinaryWriter();
    w.writeBytes(data);
    const r = new BinaryReader(w.toUint8Array());
    expect(r.readBytes()).toEqual(data);
  });

  // ---------- Buffer Growth ----------

  it("should auto-grow buffer when capacity exceeded", () => {
    const w = new BinaryWriter(4); // Start with tiny buffer
    for (let i = 0; i < 100; i++) {
      w.writeUint32(i);
    }
    const r = new BinaryReader(w.toUint8Array());
    for (let i = 0; i < 100; i++) {
      expect(r.readUint32()).toBe(i);
    }
  });

  // ---------- hasMore ----------

  it("should report hasMore correctly", () => {
    const w = new BinaryWriter();
    w.writeUint8(1);
    const r = new BinaryReader(w.toUint8Array());
    expect(r.hasMore()).toBe(true);
    r.readUint8();
    expect(r.hasMore()).toBe(false);
  });
});

// ============================================================
// Snapshot Encoding / Decoding
// ============================================================

describe("Snapshot encoding/decoding", () => {
  it("should round-trip an empty snapshot", () => {
    const snapshot = {
      version: 1,
      timestamp: 1234567890,
      entries: [],
    };

    const encoded = encodeSnapshot(snapshot);
    const decoded = decodeSnapshot(encoded);

    expect(decoded.version).toBe(1);
    expect(decoded.timestamp).toBe(1234567890);
    expect(decoded.entries).toEqual([]);
  });

  it("should round-trip snapshot with multiple entries", () => {
    const snapshot = {
      version: 1,
      timestamp: Date.now(),
      entries: [
        { id: "map-1", type: "SharedMap", data: new Uint8Array([1, 2, 3]) },
        { id: "map-2", type: "SharedMap", data: new Uint8Array([4, 5, 6, 7, 8]) },
      ],
    };

    const encoded = encodeSnapshot(snapshot);
    const decoded = decodeSnapshot(encoded);

    expect(decoded.entries).toHaveLength(2);
    expect(decoded.entries[0].id).toBe("map-1");
    expect(decoded.entries[0].type).toBe("SharedMap");
    expect(decoded.entries[0].data).toEqual(new Uint8Array([1, 2, 3]));
    expect(decoded.entries[1].id).toBe("map-2");
    expect(decoded.entries[1].data).toEqual(new Uint8Array([4, 5, 6, 7, 8]));
  });

  it("should produce smaller output than JSON for typical data", () => {
    const snapshot = {
      version: 1,
      timestamp: 1717200000000,
      entries: [
        { id: "config", type: "SharedMap", data: new Uint8Array(100) },
        { id: "users", type: "SharedMap", data: new Uint8Array(200) },
      ],
    };

    const binarySize = encodeSnapshot(snapshot).length;
    const jsonSize = JSON.stringify(snapshot).length;

    // Binary should be smaller or comparable
    expect(binarySize).toBeLessThan(jsonSize);
  });

  it("should throw on invalid magic bytes", () => {
    const bad = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x01]);
    expect(() => decodeSnapshot(bad)).toThrow(SnapshotError);
  });

  it("should throw on unsupported version", () => {
    const w = new BinaryWriter();
    // Write magic bytes
    w.writeUint8(0x46); // F
    w.writeUint8(0x4c); // L
    w.writeUint8(0x55); // U
    w.writeUint8(0x49); // I
    w.writeUint8(0x44); // D
    w.writeUint8(99); // version 99
    expect(() => decodeSnapshot(w.toUint8Array())).toThrow(SnapshotError);
  });
});
