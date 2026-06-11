/**
 * 高性能二进制编码器。
 * 使用 Tag + Length + Value 格式（类 MessagePack），支持自动扩容。
 */
export declare class BinaryEncoder {
    private buffer;
    private view;
    private offset;
    constructor(initialSize?: number);
    /** 编码 null 值。 */
    writeNull(): void;
    /** 编码布尔值。 */
    writeBool(value: boolean): void;
    /** 编码 32 位整数（大端序）。 */
    writeInt32(value: number): void;
    /** 编码 64 位浮点数（IEEE 754）。 */
    writeFloat64(value: number): void;
    /** 编码字符串（4 字节长度前缀 + UTF-8 字节）。 */
    writeString(value: string): void;
    /** 编码二进制数据（4 字节长度前缀 + 原始字节）。 */
    writeBytes(value: Uint8Array): void;
    /** 编码数组（4 字节元素数 + 逐个编码元素）。 */
    writeArray(value: unknown[]): void;
    /** 编码对象/映射（4 字节键值对数 + 逐个编码键值对）。 */
    writeMap(value: Record<string, unknown>): void;
    /**
     * 自动分发编码任意值。
     * 根据值的类型选择对应的编码方法。
     */
    writeValue(value: unknown): void;
    /** 获取编码后的二进制数据。 */
    toUint8Array(): Uint8Array;
    /** 获取当前已写入的字节数。 */
    get byteLength(): number;
    /**
     * 确保缓冲区有足够的空间。
     * 不足时按倍增策略扩容。
     */
    private ensureCapacity;
}
//# sourceMappingURL=BinaryEncoder.d.ts.map