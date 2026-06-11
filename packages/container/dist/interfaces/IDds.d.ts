/**
 * 所有分布式数据结构（DDS）的基接口。
 */
export interface ISharedObject {
    readonly id: string;
    readonly type: string;
    readonly attached: boolean;
    /** 获取当前快照数据（二进制格式）。 */
    snapshot(): Uint8Array;
    /** 从快照数据恢复状态。 */
    loadFromSnapshot(data: Uint8Array): void;
    /** 监听事件。 */
    on<K extends keyof IDdsEvents & string>(event: K, listener: IDdsEvents[K]): this;
    /** 取消监听事件。 */
    off<K extends keyof IDdsEvents & string>(event: K, listener: IDdsEvents[K]): this;
    /** 释放资源。 */
    dispose(): void;
}
/** DDS 事件定义。 */
export interface IDdsEvents {
    [key: string]: (...args: any[]) => void;
    /** 数据变更事件。 */
    changed: (event: IDdsChangeEvent) => void;
    /** 错误事件。 */
    error: (error: Error) => void;
}
/** DDS 数据变更事件。 */
export interface IDdsChangeEvent {
    readonly objectId: string;
    readonly type: string;
    readonly path?: string;
}
//# sourceMappingURL=IDds.d.ts.map