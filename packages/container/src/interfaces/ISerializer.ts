/**
 * 二进制序列化器接口。
 */
export interface IBinarySerializer {
	/** 将任意值编码为二进制。 */
	encode(value: unknown): Uint8Array;
	/** 将二进制数据解码为原始值。 */
	decode(data: Uint8Array): unknown;
}
