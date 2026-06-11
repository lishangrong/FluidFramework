import { SharedObjectBase } from "../dds/SharedObjectBase.js";
import { DdsFactory } from "../dds/DdsFactory.js";
import { DdsError } from "../errors/DdsError.js";
import { ContainerErrorCode } from "../errors/ContainerErrorCode.js";
import { generateUuid } from "../utils/uuid.js";
/**
 * 容器运行时。
 * 管理所有 DDS 实例的生命周期、操作路由和远端消息处理。
 */
export class ContainerRuntime {
    containerId;
    objects = new Map();
    factory;
    orderer;
    _disposed = false;
    lastSequenceNumber = 0;
    constructor(containerId, factory) {
        this.containerId = containerId;
        this.factory = factory ?? new DdsFactory();
    }
    /**
     * 连接排序服务。
     */
    connectOrderer(orderer) {
        this.orderer = orderer;
    }
    /**
     * 获取 DDS 工厂中已注册的类型集合。
     */
    getRegisteredTypes() {
        return this.factory.getRegisteredTypes();
    }
    /**
     * 获取已注册的 DDS 实例。
     */
    getObject(id) {
        return this.objects.get(id);
    }
    /**
     * 创建新的 DDS 实例并注册到运行时。
     */
    createObject(type, id) {
        const objectId = id ?? generateUuid();
        if (this.objects.has(objectId)) {
            throw new DdsError(`DDS 对象 "${objectId}" 已存在`, ContainerErrorCode.DdsAlreadyExists, { objectId });
        }
        const obj = this.factory.create(type, objectId);
        obj.attach((oid, op) => this.submitOp(oid, op));
        this.objects.set(objectId, obj);
        return obj;
    }
    /**
     * 提交操作到排序服务。
     */
    async submitOp(objectId, op) {
        if (!this.orderer) {
            return;
        }
        await this.orderer.submit({
            type: "op",
            contents: { objectId, op },
        });
    }
    /**
     * 处理从服务端接收的已排序消息。
     * 根据消息中的 objectId 路由到对应的 DDS 实例。
     */
    processRemoteOp(message) {
        this.lastSequenceNumber = message.sequenceNumber;
        const contents = message.contents;
        if (!contents?.objectId) {
            return;
        }
        const obj = this.objects.get(contents.objectId);
        if (obj) {
            obj.processRemoteOp(contents.op);
        }
    }
    /**
     * 获取当前最后处理的序列号。
     */
    getLastSequenceNumber() {
        return this.lastSequenceNumber;
    }
    /**
     * 获取所有 DDS 实例的快照数据。
     */
    snapshotAll() {
        const snapshots = new Map();
        for (const [id, obj] of this.objects) {
            snapshots.set(id, obj.snapshot());
        }
        return snapshots;
    }
    /**
     * 从快照数据恢复所有 DDS 实例。
     */
    loadAll(snapshots) {
        for (const [id, data] of snapshots) {
            const obj = this.objects.get(id);
            if (obj) {
                obj.loadFromSnapshot(data);
            }
        }
    }
    /**
     * 释放所有 DDS 资源。
     */
    dispose() {
        if (this._disposed) {
            return;
        }
        this._disposed = true;
        for (const obj of this.objects.values()) {
            obj.dispose();
        }
        this.objects.clear();
        if (this.orderer) {
            this.orderer.disconnect();
            this.orderer = undefined;
        }
    }
}
//# sourceMappingURL=ContainerRuntime.js.map