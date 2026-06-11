/**
 * 文档服务抽象，代表对一个具体文档后端的连接能力。
 */
export interface IDocumentService {
	readonly protocolName: string;
	connectToDeltaStorage(url: string): Promise<IDeltaStorageService>;
	connectToStorage(url: string): Promise<IDocumentStorageService>;
	connectToOrderer(url: string): Promise<IOrdererConnection>;
	dispose(): void;
}

export interface IDeltaStorageService {
	get(from: number, to: number): Promise<ISequencedMessage[]>;
}

export interface IDocumentStorageService {
	read(id: string): Promise<string>;
	getSnapshotTree(version?: string): Promise<ISnapshotTree | null>;
}

export interface IOrdererConnection {
	submit(message: IDocumentMessage): Promise<void>;
	disconnect(): void;
}

export interface ISequencedMessage {
	readonly sequenceNumber: number;
	readonly contents: unknown;
}

export interface IDocumentMessage {
	readonly type: string;
	readonly contents: unknown;
}

export interface ISnapshotTree {
	readonly id: string;
	readonly blobs: Record<string, string>;
	readonly trees: Record<string, ISnapshotTree>;
}
