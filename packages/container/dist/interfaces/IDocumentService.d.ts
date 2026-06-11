/**
 * 文档服务抽象，代表对一个具体文档后端的连接能力。
 * 与 loader 模块的接口结构兼容但解耦。
 */
export interface IDocumentService {
    readonly protocolName: string;
    connectToDeltaStorage(url: string): Promise<IDeltaStorageService>;
    connectToStorage(url: string): Promise<IDocumentStorageService>;
    connectToOrderer(url: string): Promise<IOrdererConnection>;
    dispose(): void;
}
/** 增量存储服务，用于获取已排序的操作消息。 */
export interface IDeltaStorageService {
    get(from: number, to: number): Promise<ISequencedMessage[]>;
}
/** 文档存储服务，用于读取快照数据。 */
export interface IDocumentStorageService {
    read(id: string): Promise<string>;
    getSnapshotTree(version?: string): Promise<ISnapshotTree | null>;
}
/** 排序服务连接，用于提交和接收操作消息。 */
export interface IOrdererConnection {
    submit(message: IDocumentMessage): Promise<void>;
    disconnect(): void;
}
/** 已排序的消息。 */
export interface ISequencedMessage {
    readonly sequenceNumber: number;
    readonly contents: unknown;
}
/** 待提交的文档操作消息。 */
export interface IDocumentMessage {
    readonly type: string;
    readonly contents: unknown;
}
/** 快照树结构。 */
export interface ISnapshotTree {
    readonly id: string;
    readonly blobs: Record<string, string>;
    readonly trees: Record<string, ISnapshotTree>;
}
/** 已解析的文档 URL。 */
export interface IResolvedUrl {
    readonly type: string;
    readonly url: string;
    readonly endpoints: IEndpoints;
    readonly tokens: Record<string, string>;
    readonly id: string;
}
/** 服务端点地址。 */
export interface IEndpoints {
    readonly deltaStorage: string;
    readonly orderer: string;
    readonly storage: string;
}
//# sourceMappingURL=IDocumentService.d.ts.map