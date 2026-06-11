import { SerializationError } from "../errors/SerializationError.js";
import { ContainerErrorCode } from "../errors/ContainerErrorCode.js";
/**
 * 二进制类型标签（与 BinaryEncoder 保持一致）。
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
/**
 * 高性能二进制解码器。
 * 从 BinaryEncoder 产生的二进制数据中还原原始值。
 */
export class BinaryDecoder {
    view;
    offset = 0;
    decoder = new TextDecoder();
    constructor(data) {
        this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    }
    /**
     * 自动分发解码，根据类型标签读取对应类型的值。
     */
    readValue() {
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
                throw new SerializationError(`未知的类型标签: 0x${tag.toString(16).padStart(2, "0")}`, ContainerErrorCode.InvalidBinaryFormat, { tag, offset: this.offset - 1 });
        }
    }
    /** 获取当前读取位置。 */
    get position() {
        return this.offset;
    }
    /** 检查是否还有数据可读。 */
    get hasMore() {
        return this.offset < this.view.byteLength;
    }
    /** 读取 32 位整数（不含标签）。 */
    readInt32Body() {
        this.ensureAvailable(4);
        const value = this.view.getInt32(this.offset, false);
        this.offset += 4;
        return value;
    }
    /** 读取 64 位浮点数（不含标签）。 */
    readFloat64Body() {
        this.ensureAvailable(8);
        const value = this.view.getFloat64(this.offset, false);
        this.offset += 8;
        return value;
    }
    /** 读取字符串（不含标签）。 */
    readStringBody() {
        this.ensureAvailable(4);
        const length = this.view.getUint32(this.offset, false);
        this.offset += 4;
        this.ensureAvailable(length);
        const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, length);
        this.offset += length;
        return this.decoder.decode(bytes);
    }
    /** 读取二进制数据（不含标签）。 */
    readBinaryBody() {
        this.ensureAvailable(4);
        const length = this.view.getUint32(this.offset, false);
        this.offset += 4;
        this.ensureAvailable(length);
        const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, length);
        this.offset += length;
        // 返回副本以避免底层缓冲区被修改
        return new Uint8Array(bytes);
    }
    /** 读取数组（不含标签）。 */
    readArrayBody() {
        this.ensureAvailable(4);
        const count = this.view.getUint32(this.offset, false);
        this.offset += 4;
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(this.readValue());
        }
        return result;
    }
    /** 读取对象/映射（不含标签）。 */
    readMapBody() {
        this.ensureAvailable(4);
        const count = this.view.getUint32(this.offset, false);
        this.offset += 4;
        const result = {};
        for (let i = 0; i < count; i++) {
            // 键必须是字符串，先读取标签并验证
            this.ensureAvailable(1);
            const keyTag = this.view.getUint8(this.offset++);
            if (keyTag !== TypeTag.String) {
                throw new SerializationError(`Map 的键必须是字符串，实际标签: 0x${keyTag.toString(16).padStart(2, "0")}`, ContainerErrorCode.InvalidBinaryFormat, { tag: keyTag, offset: this.offset - 1 });
            }
            const key = this.readStringBody();
            result[key] = this.readValue();
        }
        return result;
    }
    /**
     * 确保有足够的数据可读。
     */
    ensureAvailable(needed) {
        if (this.offset + needed > this.view.byteLength) {
            throw new SerializationError(`数据不足: 需要 ${needed} 字节，剩余 ${this.view.byteLength - this.offset} 字节`, ContainerErrorCode.DecodeFailed, { needed, available: this.view.byteLength - this.offset, offset: this.offset });
        }
    }
}
//# sourceMappingURL=BinaryDecoder.js.map