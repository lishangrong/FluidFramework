import type { ISharedObject } from "./IDds.js";
import type { ISequencedMessage } from "./IDocumentService.js";
/**
 * 容器运行时接口。管理所有 DDS 实例的生命周期和操作路由。
 */
export interface IContainerRuntime {
    readonly containerId: string;
    /** 获取已注册的 DDS 实例。 */
    getObject<T extends ISharedObject>(id: string): T | undefined;
    /** 创建新的 DDS 实例。 */
    createObject<T extends ISharedObject>(type: string, id?: string): T;
    /** 提交操作到排序服务。 */
    submitOp(objectId: string, op: unknown): Promise<void>;
    /** 处理从服务端接收的已排序消息。 */
    processRemoteOp(message: ISequencedMessage): void;
    /** 获取所有 DDS 实例的快照数据。 */
    snapshotAll(): Map<string, Uint8Array>;
    /** 从快照数据恢复所有 DDS 实例。 */
    loadAll(snapshots: Map<string, Uint8Array>): void;
    /** 释放所有资源。 */
    dispose(): void;
}
//# sourceMappingURL=IContainerRuntime.d.ts.map