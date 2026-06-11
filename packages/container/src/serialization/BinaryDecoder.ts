import { SerializationError } from "../errors/SerializationError.js";
import { ContainerErrorCode } from "../errors/ContainerErrorCode.js";

/**
 * 二进制类型标签（与 BinaryEncoder 保持一致）。
 */
const enum TypeTag {
	Null = 0x00,
	False = 0x01,
	True = 0x02,
	Int32 = 0x10,
	Float64 = 0x11,
	String = 0x20,
	Binary = 0x30,
	Array = 0x40,
	Map = 0x50,
}

/**
 * 高性能二进制解码器。
 * 从 BinaryEncoder 产生的二进制数据中还原原始值。
 */
export class BinaryDecoder {
	private readonly view: DataView;
	private offset: number = 0;
	private readonly decoder = new TextDecoder();

	constructor(data: Uint8Array) {
		this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	}

	/**
	 * 自动分发解码，根据类型标签读取对应类型的值。
	 */
	readValue(): unknown {
		this.ensureAvailable(1);
		const tag = this.view.getUint8(this.offset++);

		switch (tag) {
			case TypeTag.Null:
				return null;
			case TypeTag.False:
				return false;
			case TypeTag.True:
				return true;
			case TypeTag.Int32:
				return this.readInt32Body();
			case TypeTag.Float64:
				return this.readFloat64Body();
			case TypeTag.String:
				return this.readStringBody();
			case TypeTag.Binary:
				return this.readBinaryBody();
			case TypeTag.Array:
				return this.readArrayBody();
			case TypeTag.Map:
				return this.readMapBody();
			default:
				throw new SerializationError(
					`未知的类型标签: 0x${tag.toString(16).padStart(2, "0")}`,
					ContainerErrorCode.InvalidBinaryFormat,
					{ tag, offset: this.offset - 1 },
				);
		}
	}

	/** 获取当前读取位置。 */
	get position(): number {
		return this.offset;
	}

	/** 检查是否还有数据可读。 */
	get hasMore(): boolean {
		return this.offset < this.view.byteLength;
	}

	/** 读取 32 位整数（不含标签）。 */
	private readInt32Body(): number {
		this.ensureAvailable(4);
		const value = this.view.getInt32(this.offset, false);
		this.offset += 4;
		return value;
	}

	/** 读取 64 位浮点数（不含标签）。 */
	private readFloat64Body(): number {
		this.ensureAvailable(8);
		const value = this.view.getFloat64(this.offset, false);
		this.offset += 8;
		return value;
	}

	/** 读取字符串（不含标签）。 */
	private readStringBody(): string {
		this.ensureAvailable(4);
		const length = this.view.getUint32(this.offset, false);
		this.offset += 4;
		this.ensureAvailable(length);
		const bytes = new Uint8Array(
			this.view.buffer,
			this.view.byteOffset + this.offset,
			length,
		);
		this.offset += length;
		return this.decoder.decode(bytes);
	}

	/** 读取二进制数据（不含标签）。 */
	private readBinaryBody(): Uint8Array {
		this.ensureAvailable(4);
		const length = this.view.getUint32(this.offset, false);
		this.offset += 4;
		this.ensureAvailable(length);
		const bytes = new Uint8Array(
			this.view.buffer,
			this.view.byteOffset + this.offset,
			length,
		);
		this.offset += length;
		// 返回副本以避免底层缓冲区被修改
		return new Uint8Array(bytes);
	}

	/** 读取数组（不含标签）。 */
	private readArrayBody(): unknown[] {
		this.ensureAvailable(4);
		const count = this.view.getUint32(this.offset, false);
		this.offset += 4;
		const result: unknown[] = [];
		for (let i = 0; i < count; i++) {
			result.push(this.readValue());
		}
		return result;
	}

	/** 读取对象/映射（不含标签）。 */
	private readMapBody(): Record<string, unknown> {
		this.ensureAvailable(4);
		const count = this.view.getUint32(this.offset, false);
		this.offset += 4;
		const result: Record<string, unknown> = {};
		for (let i = 0; i < count; i++) {
			// 键必须是字符串，先读取标签并验证
			this.ensureAvailable(1);
			const keyTag = this.view.getUint8(this.offset++);
			if (keyTag !== TypeTag.String) {
				throw new SerializationError(
					`Map 的键必须是字符串，实际标签: 0x${keyTag.toString(16).padStart(2, "0")}`,
					ContainerErrorCode.InvalidBinaryFormat,
					{ tag: keyTag, offset: this.offset - 1 },
				);
			}
			const key = this.readStringBody();
			result[key] = this.readValue();
		}
		return result;
	}

	/**
	 * 确保有足够的数据可读。
	 */
	private ensureAvailable(needed: number): void {
		if (this.offset + needed > this.view.byteLength) {
			throw new SerializationError(
				`数据不足: 需要 ${needed} 字节，剩余 ${this.view.byteLength - this.offset} 字节`,
				ContainerErrorCode.DecodeFailed,
				{ needed, available: this.view.byteLength - this.offset, offset: this.offset },
			);
		}
	}
}
