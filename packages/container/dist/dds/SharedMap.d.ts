import { SharedObjectBase } from "./SharedObjectBase.js";
import type { ISharedMap } from "../interfaces/ISharedMap.js";
/**
 * 共享键值对数据结构。
 * 支持多客户端并发读写，通过操作日志保证最终一致性。
 */
export declare class SharedMap extends SharedObjectBase implements ISharedMap {
    static readonly TYPE = "SharedMap";
    private readonly data;
    constructor(id: string);
    get size(): number;
    get<T = unknown>(key: string): T | undefined;
    set<T = unknown>(key: string, value: T): void;
    delete(key: string): boolean;
    has(key: string): boolean;
    keys(): IterableIterator<string>;
    forEach(callback: (value: unknown, key: string) => void): void;
    /**
     * 将当前状态序列化为二进制快照。
     */
    snapshot(): Uint8Array;
    /**
     * 从二进制快照恢复状态。
     */
    loadFromSnapshot(data: Uint8Array): void;
    /**
     * 应用远端操作。
     */
    applyOp(op: unknown): void;
}
//# sourceMappingURL=SharedMap.d.ts.map