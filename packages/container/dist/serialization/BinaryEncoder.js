import { SerializationError } from "../errors/SerializationError.js";
import { ContainerErrorCode } from "../errors/ContainerErrorCode.js";
/**
 * 二进制类型标签。
 * 每个标签占 1 字节，标识后续数据的类型。
 */
var TypeTag;
(function (TypeTag) {
    TypeTag[TypeTag["Null"] = 0] = "Null";
    TypeTag[TypeTag["False"] = 1] = "False";
    TypeTag[TypeTag["True"] = 2] = "True";
    TypeTag[TypeTag["Int32"] = 16] = "Int32";
    TypeTag[TypeTag["Float64"] = 17] = "Float64";
    TypeTag[TypeTag["String"] = 32] = "String";
    TypeTag[TypeTag["Binary"] = 48] = "Binary";
    TypeTag[TypeTag["Array"] = 64] = "Array";
    TypeTag[TypeTag["Map"] = 80] = "Map";
})(TypeTag || (TypeTag = {}));
/** 默认初始缓冲区大小（256 字节）。 */
const DEFAULT_INITIAL_SIZE = 256;
/**
 * 高性能二进制编码器。
 * 使用 Tag + Length + Value 格式（类 MessagePack），支持自动扩容。
 */
export class BinaryEncoder {
    buffer;
    view;
    offset = 0;
    constructor(initialSize = DEFAULT_INITIAL_SIZE) {
        this.buffer = new ArrayBuffer(initialSize);
        this.view = new DataView(this.buffer);
    }
    /** 编码 null 值。 */
    writeNull() {
        this.ensureCapacity(1);
        this.view.setUint8(this.offset++, TypeTag.Null);
    }
    /** 编码布尔值。 */
    writeBool(value) {
        this.ensureCapacity(1);
        this.view.setUint8(this.offset++, value ? TypeTag.True : TypeTag.False);
    }
    /** 编码 32 位整数（大端序）。 */
    writeInt32(value) {
        this.ensureCapacity(5);
        this.view.setUint8(this.offset++, TypeTag.Int32);
        this.view.setInt32(this.offset, value, false);
        this.offset += 4;
    }
    /** 编码 64 位浮点数（IEEE 754）。 */
    writeFloat64(value) {
        this.ensureCapacity(9);
        this.view.setUint8(this.offset++, TypeTag.Float64);
        this.view.setFloat64(this.offset, value, false);
        this.offset += 8;
    }
    /** 编码字符串（4 字节长度前缀 + UTF-8 字节）。 */
    writeString(value) {
        const encoded = new TextEncoder().encode(value);
        this.ensureCapacity(5 + encoded.byteLength);
        this.view.setUint8(this.offset++, TypeTag.String);
        this.view.setUint32(this.offset, encoded.byteLength, false);
        this.offset += 4;
        new Uint8Array(this.buffer, this.offset).set(encoded);
        this.offset += encoded.byteLength;
    }
    /** 编码二进制数据（4 字节长度前缀 + 原始字节）。 */
    writeBytes(value) {
        this.ensureCapacity(5 + value.byteLength);
        this.view.setUint8(this.offset++, TypeTag.Binary);
        this.view.setUint32(this.offset, value.byteLength, false);
        this.offset += 4;
        new Uint8Array(this.buffer, this.offset).set(value);
        this.offset += value.byteLength;
    }
    /** 编码数组（4 字节元素数 + 逐个编码元素）。 */
    writeArray(value) {
        this.ensureCapacity(5);
        this.view.setUint8(this.offset++, TypeTag.Array);
        this.view.setUint32(this.offset, value.length, false);
        this.offset += 4;
        for (const item of value) {
            this.writeValue(item);
        }
    }
    /** 编码对象/映射（4 字节键值对数 + 逐个编码键值对）。 */
    writeMap(value) {
        const entries = Object.entries(value);
        this.ensureCapacity(5);
        this.view.setUint8(this.offset++, TypeTag.Map);
        this.view.setUint32(this.offset, entries.length, false);
        this.offset += 4;
        for (const [key, val] of entries) {
            this.writeString(key);
            this.writeValue(val);
        }
    }
    /**
     * 自动分发编码任意值。
     * 根据值的类型选择对应的编码方法。
     */
    writeValue(value) {
        if (value === null || value === undefined) {
            this.writeNull();
        }
        else if (typeof value === "boolean") {
            this.writeBool(value);
        }
        else if (typeof value === "number") {
            if (Number.isInteger(value) && value >= -2147483648 && value <= 2147483647) {
                this.writeInt32(value);
            }
            else {
                this.writeFloat64(value);
            }
        }
        else if (typeof value === "string") {
            this.writeString(value);
        }
        else if (value instanceof Uint8Array) {
            this.writeBytes(value);
        }
        else if (Array.isArray(value)) {
            this.writeArray(value);
        }
        else if (typeof value === "object") {
            this.writeMap(value);
        }
        else {
            throw new SerializationError(`不支持的编码类型: ${typeof value}`, ContainerErrorCode.UnsupportedType, { valueType: typeof value });
        }
    }
    /** 获取编码后的二进制数据。 */
    toUint8Array() {
        return new Uint8Array(this.buffer, 0, this.offset);
    }
    /** 获取当前已写入的字节数。 */
    get byteLength() {
        return this.offset;
    }
    /**
     * 确保缓冲区有足够的空间。
     * 不足时按倍增策略扩容。
     */
    ensureCapacity(needed) {
        const required = this.offset + needed;
        if (required <= this.buffer.byteLength) {
            return;
        }
        let newSize = this.buffer.byteLength;
        while (newSize < required) {
            newSize *= 2;
        }
        const newBuffer = new ArrayBuffer(newSize);
        new Uint8Array(newBuffer).set(new Uint8Array(this.buffer, 0, this.offset));
        this.buffer = newBuffer;
        this.view = new DataView(this.buffer);
    }
}
//# sourceMappingURL=BinaryEncoder.js.map