import { TypedEventEmitter } from "../utils/EventEmitter.js";
import { BinarySerializer } from "../serialization/BinarySerializer.js";
/**
 * 所有分布式数据结构的抽象基类。
 * 提供事件发射、快照序列化和操作提交的基础能力。
 */
export class SharedObjectBase extends TypedEventEmitter {
    id;
    type;
    _attached = false;
    _disposed = false;
    serializer;
    /** 操作提交回调，由 ContainerRuntime 注入。 */
    _submitOpCallback;
    constructor(id, type) {
        super();
        this.id = id;
        this.type = type;
        this.serializer = new BinarySerializer();
    }
    get attached() {
        return this._attached;
    }
    get disposed() {
        return this._disposed;
    }
    /**
     * 将此对象标记为已附加到容器。
     */
    attach(submitOp) {
        this._attached = true;
        this._submitOpCallback = submitOp;
    }
    /**
     * 提交本地操作到排序服务。
     */
    async submitOp(op) {
        if (this._submitOpCallback) {
            await this._submitOpCallback(this.id, op);
        }
    }
    /**
     * 处理远端操作并触发变更事件。
     */
    processRemoteOp(op) {
        this.applyOp(op);
        this.safeEmit("changed", {
            objectId: this.id,
            type: this.type,
        });
    }
    /**
     * 释放资源。
     */
    dispose() {
        if (this._disposed) {
            return;
        }
        this._disposed = true;
        this._attached = false;
        this._submitOpCallback = undefined;
        this.removeAllListeners();
    }
}
//# sourceMappingURL=SharedObjectBase.js.map