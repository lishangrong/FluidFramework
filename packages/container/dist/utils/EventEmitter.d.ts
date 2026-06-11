/**
 * 类型安全的事件发射器。
 * 包装 node:events 的 EventEmitter，提供泛型事件类型支持。
 */
export declare class TypedEventEmitter<TEvents extends Record<string, (...args: any[]) => void>> {
    private readonly emitter;
    /**
     * 监听指定事件。
     */
    on<K extends keyof TEvents & string>(event: K, listener: TEvents[K]): this;
    /**
     * 取消监听指定事件。
     */
    off<K extends keyof TEvents & string>(event: K, listener: TEvents[K]): this;
    /**
     * 安全地触发事件。捕获监听器异常并通过 error 事件传播。
     */
    protected safeEmit<K extends keyof TEvents & string>(event: K, ...args: Parameters<TEvents[K]>): boolean;
    /**
     * 触发事件。
     */
    protected emit<K extends keyof TEvents & string>(event: K, ...args: Parameters<TEvents[K]>): boolean;
    /**
     * 获取指定事件的监听器数量。
     */
    listenerCount<K extends keyof TEvents & string>(event: K): number;
    /**
     * 移除所有事件监听器。
     */
    removeAllListeners<K extends keyof TEvents & string>(event?: K): this;
}
//# sourceMappingURL=EventEmitter.d.ts.map