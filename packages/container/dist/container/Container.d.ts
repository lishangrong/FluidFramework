import type { IContainer, IContainerConfig } from "../interfaces/IContainer.js";
import type { IContainerEvents } from "../interfaces/IContainerEvents.js";
import type { IContainerSchema } from "../interfaces/IContainerSchema.js";
import type { ISharedObject } from "../interfaces/IDds.js";
import type { ISnapshotResult } from "../interfaces/ISnapshot.js";
import { TypedEventEmitter } from "../utils/EventEmitter.js";
/**
 * Fluid 容器。
 * 组合 schema、运行时、快照管理器等模块，提供统一的数据模型管理能力。
 */
export declare class Container extends TypedEventEmitter<IContainerEvents> implements IContainer {
    readonly id: string;
    readonly schema: IContainerSchema;
    private readonly _schema;
    private readonly runtime;
    private readonly snapshotManager;
    private readonly serializer;
    private readonly initialObjectNames;
    private _disposed;
    private deltaStorage?;
    private documentStorage?;
    private constructor();
    get disposed(): boolean;
    /**
     * 创建新容器。
     * 实例化所有初始对象，触发 onCreate 事件。
     */
    static create(config: IContainerConfig): Promise<Container>;
    /**
     * 加载已有容器。
     * 从存储服务加载快照并恢复状态，触发 onLoad 事件。
     */
    static load(config: IContainerConfig): Promise<Container>;
    /**
     * 获取初始对象中的 DDS 实例。
     */
    getInitialObject<T extends ISharedObject>(name: string): T;
    /**
     * 动态创建新的 DDS 实例。
     * 类型必须在 schema 的 dynamicObjectTypes 中声明。
     */
    createDynamicObject<T extends ISharedObject>(type: string, id?: string): Promise<T>;
    /**
     * 创建当前状态的快照。
     */
    snapshot(): Promise<ISnapshotResult>;
    /**
     * 释放所有资源并销毁容器。
     */
    dispose(): void;
    /**
     * 创建 schema 中定义的所有初始对象。
     */
    private createInitialObjects;
    /**
     * 连接文档服务。
     */
    private connectServices;
    /**
     * 确保容器未被销毁。
     */
    private ensureNotDisposed;
}
//# sourceMappingURL=Container.d.ts.map