/**
 * 高性能二进制解码器。
 * 从 BinaryEncoder 产生的二进制数据中还原原始值。
 */
export declare class BinaryDecoder {
    private readonly view;
    private offset;
    private readonly decoder;
    constructor(data: Uint8Array);
    /**
     * 自动分发解码，根据类型标签读取对应类型的值。
     */
    readValue(): unknown;
    /** 获取当前读取位置。 */
    get position(): number;
    /** 检查是否还有数据可读。 */
    get hasMore(): boolean;
    /** 读取 32 位整数（不含标签）。 */
    private readInt32Body;
    /** 读取 64 位浮点数（不含标签）。 */
    private readFloat64Body;
    /** 读取字符串（不含标签）。 */
    private readStringBody;
    /** 读取二进制数据（不含标签）。 */
    private readBinaryBody;
    /** 读取数组（不含标签）。 */
    private readArrayBody;
    /** 读取对象/映射（不含标签）。 */
    private readMapBody;
    /**
     * 确保有足够的数据可读。
     */
    private ensureAvailable;
}
//# sourceMappingURL=BinaryDecoder.d.ts.map