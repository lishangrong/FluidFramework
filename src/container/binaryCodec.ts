/**
 * Fluid Container - High-Performance Binary Codec
 *
 * Provides compact binary encoding/decoding for container snapshots,
 * minimizing network payload for cross-client synchronization.
 *
 * Binary format:
 *   Header:  magic (5 bytes: 0x46,0x4C,0x55,0x49,0x44 = "FLUID") + version (1 byte)
 *   Body:    entry count (VarInt) + entries
 *   Entry:   id (len-prefixed string) + type (len-prefixed string) + data (len-prefixed bytes)
 */

import { SnapshotError } from "./errors";
import type { IContainerSnapshot, ISnapshotEntry } from "./types";

// ============================================================
// Constants
// ============================================================

const MAGIC = new Uint8Array([0x46, 0x4c, 0x55, 0x49, 0x44]); // "FLUID"
const FORMAT_VERSION = 1;

// ============================================================
// BinaryWriter
// ============================================================

/** Append-only binary writer with automatic buffer growth */
export class BinaryWriter {
  private buffer: Uint8Array;
  private view: DataView;
  private offset: number;

  constructor(initialCapacity = 256) {
    this.buffer = new Uint8Array(initialCapacity);
    this.view = new DataView(this.buffer.buffer);
    this.offset = 0;
  }

  /** Ensure at least `bytes` more bytes can be written */
  private ensure(bytes: number): void {
    if (this.offset + bytes <= this.buffer.length) return;
    let newCap = this.buffer.length * 2;
    while (newCap < this.offset + bytes) newCap *= 2;
    const newBuf = new Uint8Array(newCap);
    newBuf.set(this.buffer.subarray(0, this.offset));
    this.buffer = newBuf;
    this.view = new DataView(this.buffer.buffer);
  }

  writeUint8(value: number): void {
    this.ensure(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }

  writeUint16(value: number): void {
    this.ensure(2);
    this.view.setUint16(this.offset, value, true); // little-endian
    this.offset += 2;
  }

  writeUint32(value: number): void {
    this.ensure(4);
    this.view.setUint32(this.offset, value, true);
    this.offset += 4;
  }

  writeFloat64(value: number): void {
    this.ensure(8);
    this.view.setFloat64(this.offset, value, true);
    this.offset += 8;
  }

  /** Write a variable-length integer (1-5 bytes for uint32 range) */
  writeVarInt(value: number): void {
    this.ensure(5);
    let v = value >>> 0; // ensure unsigned 32-bit
    while (v > 0x7f) {
      this.buffer[this.offset++] = (v & 0x7f) | 0x80;
      v >>>= 7;
    }
    this.buffer[this.offset++] = v;
  }

  /** Write a length-prefixed UTF-8 string */
  writeString(value: string): void {
    const encoded = new TextEncoder().encode(value);
    this.writeVarInt(encoded.length);
    this.ensure(encoded.length);
    this.buffer.set(encoded, this.offset);
    this.offset += encoded.length;
  }

  /** Write length-prefixed raw bytes */
  writeBytes(data: Uint8Array): void {
    this.writeVarInt(data.length);
    this.ensure(data.length);
    this.buffer.set(data, this.offset);
    this.offset += data.length;
  }

  /** Get the written bytes (trimmed to actual size) */
  toUint8Array(): Uint8Array {
    return this.buffer.slice(0, this.offset);
  }
}

// ============================================================
// BinaryReader
// ============================================================

/** Sequential binary reader with position tracking */
export class BinaryReader {
  private view: DataView;
  public offset: number;
  private readonly end: number;

  constructor(data: Uint8Array, offset = 0) {
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    this.offset = offset;
    this.end = data.byteLength;
  }

  private ensure(bytes: number): void {
    if (this.offset + bytes > this.end) {
      throw new SnapshotError(`Unexpected end of binary data at offset ${this.offset}`);
    }
  }

  readUint8(): number {
    this.ensure(1);
    const v = this.view.getUint8(this.offset);
    this.offset += 1;
    return v;
  }

  readUint16(): number {
    this.ensure(2);
    const v = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return v;
  }

  readUint32(): number {
    this.ensure(4);
    const v = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }

  readFloat64(): number {
    this.ensure(8);
    const v = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return v;
  }

  /** Read a variable-length integer */
  readVarInt(): number {
    let result = 0;
    let shift = 0;
    while (true) {
      this.ensure(1);
      const byte = this.view.getUint8(this.offset++);
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
      if (shift >= 35) {
        throw new SnapshotError("VarInt too long");
      }
    }
    return result >>> 0;
  }

  /** Read a length-prefixed UTF-8 string */
  readString(): string {
    const len = this.readVarInt();
    this.ensure(len);
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
    this.offset += len;
    return new TextDecoder().decode(bytes);
  }

  /** Read length-prefixed raw bytes */
  readBytes(): Uint8Array {
    const len = this.readVarInt();
    this.ensure(len);
    const bytes = new Uint8Array(len);
    const src = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
    bytes.set(src);
    this.offset += len;
    return bytes;
  }

  /** Check if there are more bytes to read */
  hasMore(): boolean {
    return this.offset < this.end;
  }
}

// ============================================================
// Snapshot Encoding / Decoding
// ============================================================

/** Encode a single DDS entry into binary */
function encodeDDSEntry(writer: BinaryWriter, entry: ISnapshotEntry): void {
  writer.writeString(entry.id);
  writer.writeString(entry.type);
  writer.writeBytes(entry.data);
}

/** Decode a single DDS entry from the reader */
function decodeDDSEntry(reader: BinaryReader): ISnapshotEntry {
  const id = reader.readString();
  const type = reader.readString();
  const data = reader.readBytes();
  return { id, type, data };
}

/** Encode a full container snapshot to a compact binary format */
export function encodeSnapshot(snapshot: IContainerSnapshot): Uint8Array {
  const writer = new BinaryWriter();

  // Header
  for (const b of MAGIC) writer.writeUint8(b);
  writer.writeUint8(FORMAT_VERSION);

  // Snapshot metadata
  writer.writeFloat64(snapshot.timestamp);

  // Entries
  writer.writeVarInt(snapshot.entries.length);
  for (const entry of snapshot.entries) {
    encodeDDSEntry(writer, entry);
  }

  return writer.toUint8Array();
}

/** Decode a binary buffer back into a container snapshot */
export function decodeSnapshot(buffer: Uint8Array): IContainerSnapshot {
  const reader = new BinaryReader(buffer);

  // Validate magic bytes
  for (const expected of MAGIC) {
    const actual = reader.readUint8();
    if (actual !== expected) {
      throw new SnapshotError("Invalid snapshot: bad magic bytes");
    }
  }

  // Read version
  const version = reader.readUint8();
  if (version !== FORMAT_VERSION) {
    throw new SnapshotError(`Unsupported snapshot version: ${version}`);
  }

  // Read metadata
  const timestamp = reader.readFloat64();

  // Read entries
  const entryCount = reader.readVarInt();
  const entries: ISnapshotEntry[] = [];
  for (let i = 0; i < entryCount; i++) {
    entries.push(decodeDDSEntry(reader));
  }

  return { version, timestamp, entries };
}
