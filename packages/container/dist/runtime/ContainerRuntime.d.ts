import type { IContainerRuntime } from "../interfaces/IContainerRuntime.js";
import type { ISharedObject } from "../interfaces/IDds.js";
import type { ISequencedMessage, IOrdererConnection } from "../interfaces/IDocumentService.js";
import { DdsFactory } from "../dds/DdsFactory.js";
/**
 * 容器运行时。
 * 管理所有 DDS 实例的生命周期、操作路由和远端消息处理。
 */
export declare class ContainerRuntime implements IContainerRuntime {
    readonly containerId: string;
    private readonly objects;
    private readonly factory;
    private orderer?;
    private _disposed;
    private lastSequenceNumber;
    constructor(containerId: string, factory?: DdsFactory);
    /**
     * 连接排序服务。
     */
    connectOrderer(orderer: IOrdererConnection): void;
    /**
     * 获取 DDS 工厂中已注册的类型集合。
     */
    getRegisteredTypes(): ReadonlySet<string>;
    /**
     * 获取已注册的 DDS 实例。
     */
    getObject<T extends ISharedObject>(id: string): T | undefined;
    /**
     * 创建新的 DDS 实例并注册到运行时。
     */
    createObject<T extends ISharedObject>(type: string, id?: string): T;
    /**
     * 提交操作到排序服务。
     */
    submitOp(objectId: string, op: unknown): Promise<void>;
    /**
     * 处理从服务端接收的已排序消息。
     * 根据消息中的 objectId 路由到对应的 DDS 实例。
     */
    processRemoteOp(message: ISequencedMessage): void;
    /**
     * 获取当前最后处理的序列号。
     */
    getLastSequenceNumber(): number;
    /**
     * 获取所有 DDS 实例的快照数据。
     */
    snapshotAll(): Map<string, Uint8Array>;
    /**
     * 从快照数据恢复所有 DDS 实例。
     */
    loadAll(snapshots: Map<string, Uint8Array>): void;
    /**
     * 释放所有 DDS 资源。
     */
    dispose(): void;
}
//# sourceMappingURL=ContainerRuntime.d.ts.map