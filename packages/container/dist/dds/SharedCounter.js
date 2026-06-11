import { SharedObjectBase } from "./SharedObjectBase.js";
/**
 * 共享原子计数器数据结构。
 * 使用增量操作（而非绝对值设置）确保并发递增的正确合并。
 */
export class SharedCounter extends SharedObjectBase {
    static TYPE = "SharedCounter";
    value = 0;
    constructor(id) {
        super(id, SharedCounter.TYPE);
    }
    getValue() {
        return this.value;
    }
    increment(amount = 1) {
        this.value += amount;
        const op = { action: "increment", amount };
        void this.submitOp(op);
        this.safeEmit("changed", {
            objectId: this.id,
            type: this.type,
        });
    }
    decrement(amount = 1) {
        this.increment(-amount);
    }
    /**
     * 将当前计数值序列化为二进制快照。
     */
    snapshot() {
        return this.serializer.encode(this.value);
    }
    /**
     * 从二进制快照恢复计数值。
     */
    loadFromSnapshot(data) {
        this.value = this.serializer.decode(data);
    }
    /**
     * 应用远端操作。
     */
    applyOp(op) {
        const counterOp = op;
        if (counterOp.action === "increment") {
            this.value += counterOp.amount;
        }
    }
}
//# sourceMappingURL=SharedCounter.js.map