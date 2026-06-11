import { TypedEventEmitter } from "../utils/EventEmitter.js";
import { BinarySerializer } from "../serialization/BinarySerializer.js";
import type { IDdsEvents, ISharedObject } from "../interfaces/IDds.js";
/**
 * 所有分布式数据结构的抽象基类。
 * 提供事件发射、快照序列化和操作提交的基础能力。
 */
export declare abstract class SharedObjectBase extends TypedEventEmitter<IDdsEvents> implements ISharedObject {
    readonly id: string;
    readonly type: string;
    private _attached;
    private _disposed;
    protected readonly serializer: BinarySerializer;
    /** 操作提交回调，由 ContainerRuntime 注入。 */
    private _submitOpCallback?;
    constructor(id: string, type: string);
    get attached(): boolean;
    get disposed(): boolean;
    /**
     * 将此对象标记为已附加到容器。
     */
    attach(submitOp: (objectId: string, op: unknown) => Promise<void>): void;
    /**
     * 获取当前状态的快照（二进制格式）。
     * 子类必须实现此方法。
     */
    abstract snapshot(): Uint8Array;
    /**
     * 从快照数据恢复状态。
     * 子类必须实现此方法。
     */
    abstract loadFromSnapshot(data: Uint8Array): void;
    /**
     * 应用来自远端的操作。
     * 子类必须实现此方法。
     */
    abstract applyOp(op: unknown): void;
    /**
     * 提交本地操作到排序服务。
     */
    protected submitOp(op: unknown): Promise<void>;
    /**
     * 处理远端操作并触发变更事件。
     */
    processRemoteOp(op: unknown): void;
    /**
     * 释放资源。
     */
    dispose(): void;
}
//# sourceMappingURL=SharedObjectBase.d.ts.map