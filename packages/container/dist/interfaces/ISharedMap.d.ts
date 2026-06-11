import type { ISharedObject } from "./IDds.js";
/**
 * 共享键值对数据结构接口。
 */
export interface ISharedMap extends ISharedObject {
    /** 获取指定键的值。 */
    get<T = unknown>(key: string): T | undefined;
    /** 设置键值对。 */
    set<T = unknown>(key: string, value: T): void;
    /** 删除指定键。 */
    delete(key: string): boolean;
    /** 判断是否包含指定键。 */
    has(key: string): boolean;
    /** 获取所有键。 */
    keys(): IterableIterator<string>;
    /** 获取键值对数量。 */
    readonly size: number;
    /** 遍历所有键值对。 */
    forEach(callback: (value: unknown, key: string) => void): void;
}
//# sourceMappingURL=ISharedMap.d.ts.map