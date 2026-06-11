import { EventEmitter as NodeEventEmitter } from "node:events";
/**
 * 类型安全的事件发射器。
 * 包装 node:events 的 EventEmitter，提供泛型事件类型支持。
 */
export class TypedEventEmitter {
    emitter = new NodeEventEmitter();
    /**
     * 监听指定事件。
     */
    on(event, listener) {
        this.emitter.on(event, listener);
        return this;
    }
    /**
     * 取消监听指定事件。
     */
    off(event, listener) {
        this.emitter.off(event, listener);
        return this;
    }
    /**
     * 安全地触发事件。捕获监听器异常并通过 error 事件传播。
     */
    safeEmit(event, ...args) {
        try {
            return this.emitter.emit(event, ...args);
        }
        catch (error) {
            if (event !== "error") {
                this.emitter.emit("error", error instanceof Error ? error : new Error(String(error)));
            }
            return false;
        }
    }
    /**
     * 触发事件。
     */
    emit(event, ...args) {
        return this.emitter.emit(event, ...args);
    }
    /**
     * 获取指定事件的监听器数量。
     */
    listenerCount(event) {
        return this.emitter.listenerCount(event);
    }
    /**
     * 移除所有事件监听器。
     */
    removeAllListeners(event) {
        if (event) {
            this.emitter.removeAllListeners(event);
        }
        else {
            this.emitter.removeAllListeners();
        }
        return this;
    }
}
//# sourceMappingURL=EventEmitter.js.map