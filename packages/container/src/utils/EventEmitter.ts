import { EventEmitter as NodeEventEmitter } from "node:events";

/**
 * 类型安全的事件发射器。
 * 包装 node:events 的 EventEmitter，提供泛型事件类型支持。
 */
export class TypedEventEmitter<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	TEvents extends Record<string, (...args: any[]) => void>,
> {
	private readonly emitter = new NodeEventEmitter();

	/**
	 * 监听指定事件。
	 */
	on<K extends keyof TEvents & string>(event: K, listener: TEvents[K]): this {
		this.emitter.on(event, listener);
		return this;
	}

	/**
	 * 取消监听指定事件。
	 */
	off<K extends keyof TEvents & string>(event: K, listener: TEvents[K]): this {
		this.emitter.off(event, listener);
		return this;
	}

	/**
	 * 安全地触发事件。捕获监听器异常并通过 error 事件传播。
	 */
	protected safeEmit<K extends keyof TEvents & string>(
		event: K,
		...args: Parameters<TEvents[K]>
	): boolean {
		try {
			return this.emitter.emit(event, ...args);
		} catch (error) {
			if (event !== "error") {
				this.emitter.emit(
					"error",
					error instanceof Error ? error : new Error(String(error)),
				);
			}
			return false;
		}
	}

	/**
	 * 触发事件。
	 */
	protected emit<K extends keyof TEvents & string>(
		event: K,
		...args: Parameters<TEvents[K]>
	): boolean {
		return this.emitter.emit(event, ...args);
	}

	/**
	 * 获取指定事件的监听器数量。
	 */
	listenerCount<K extends keyof TEvents & string>(event: K): number {
		return this.emitter.listenerCount(event);
	}

	/**
	 * 移除所有事件监听器。
	 */
	removeAllListeners<K extends keyof TEvents & string>(event?: K): this {
		if (event) {
			this.emitter.removeAllListeners(event);
		} else {
			this.emitter.removeAllListeners();
		}
		return this;
	}
}
