import { SharedObjectBase } from "./SharedObjectBase.js";
import type { ISharedCounter } from "../interfaces/ISharedCounter.js";
/**
 * 共享原子计数器数据结构。
 * 使用增量操作（而非绝对值设置）确保并发递增的正确合并。
 */
export declare class SharedCounter extends SharedObjectBase implements ISharedCounter {
    static readonly TYPE = "SharedCounter";
    private value;
    constructor(id: string);
    getValue(): number;
    increment(amount?: number): void;
    decrement(amount?: number): void;
    /**
     * 将当前计数值序列化为二进制快照。
     */
    snapshot(): Uint8Array;
    /**
     * 从二进制快照恢复计数值。
     */
    loadFromSnapshot(data: Uint8Array): void;
    /**
     * 应用远端操作。
     */
    applyOp(op: unknown): void;
}
//# sourceMappingURL=SharedCounter.d.ts.map