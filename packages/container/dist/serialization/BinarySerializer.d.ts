import type { IBinarySerializer } from "../interfaces/ISerializer.js";
/**
 * 二进制序列化器实现。
 * 组合 BinaryEncoder 和 BinaryDecoder 提供完整的序列化/反序列化能力。
 */
export declare class BinarySerializer implements IBinarySerializer {
    /**
     * 将任意值编码为二进制数据。
     */
    encode(value: unknown): Uint8Array;
    /**
     * 将二进制数据解码为原始值。
     */
    decode(data: Uint8Array): unknown;
}
//# sourceMappingURL=BinarySerializer.d.ts.map