import { SharedObjectBase } from "./SharedObjectBase.js";
/**
 * 共享键值对数据结构。
 * 支持多客户端并发读写，通过操作日志保证最终一致性。
 */
export class SharedMap extends SharedObjectBase {
    static TYPE = "SharedMap";
    data = new Map();
    constructor(id) {
        super(id, SharedMap.TYPE);
    }
    get size() {
        return this.data.size;
    }
    get(key) {
        return this.data.get(key);
    }
    set(key, value) {
        this.data.set(key, value);
        const op = { action: "set", key, value };
        void this.submitOp(op);
        this.safeEmit("changed", {
            objectId: this.id,
            type: this.type,
            path: key,
        });
    }
    delete(key) {
        const existed = this.data.delete(key);
        if (existed) {
            const op = { action: "delete", key };
            void this.submitOp(op);
            this.safeEmit("changed", {
                objectId: this.id,
                type: this.type,
                path: key,
            });
        }
        return existed;
    }
    has(key) {
        return this.data.has(key);
    }
    keys() {
        return this.data.keys();
    }
    forEach(callback) {
        this.data.forEach((value, key) => callback(value, key));
    }
    /**
     * 将当前状态序列化为二进制快照。
     */
    snapshot() {
        const obj = {};
        this.data.forEach((value, key) => {
            obj[key] = value;
        });
        return this.serializer.encode(obj);
    }
    /**
     * 从二进制快照恢复状态。
     */
    loadFromSnapshot(data) {
        const obj = this.serializer.decode(data);
        this.data.clear();
        for (const [key, value] of Object.entries(obj)) {
            this.data.set(key, value);
        }
    }
    /**
     * 应用远端操作。
     */
    applyOp(op) {
        const mapOp = op;
        switch (mapOp.action) {
            case "set":
                this.data.set(mapOp.key, mapOp.value);
                break;
            case "delete":
                this.data.delete(mapOp.key);
                break;
        }
    }
}
//# sourceMappingURL=SharedMap.js.map