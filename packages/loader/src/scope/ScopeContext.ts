import type { IScope } from "../interfaces/IScope.js";
import { LoaderError } from "../errors/LoaderError.js";
import { LoaderErrorCode } from "../errors/LoaderErrorCode.js";

let scopeCounter = 0;

/**
 * IScope 的具体实现。
 * 使用 Map 存储服务注册，支持层级查找和级联销毁。
 */
export class ScopeContext implements IScope {
	readonly id: string;
	readonly parent?: IScope;
	private readonly registry = new Map<string, unknown>();
	private readonly children = new Set<ScopeContext>();
	private _disposed = false;

	constructor(id?: string, parent?: IScope) {
		this.id = id ?? `scope-${++scopeCounter}`;
		this.parent = parent;
	}

	get disposed(): boolean {
		return this._disposed;
	}

	register<T>(key: string, value: T): void {
		this.ensureNotDisposed();
		this.registry.set(key, value);
	}

	resolve<T>(key: string): T | undefined {
		// 先查本级
		if (this.registry.has(key)) {
			return this.registry.get(key) as T;
		}
		// 再递归查父级
		if (this.parent) {
			return this.parent.resolve<T>(key);
		}
		return undefined;
	}

	has(key: string): boolean {
		return this.registry.has(key);
	}

	createChild(id?: string): IScope {
		this.ensureNotDisposed();
		const child = new ScopeContext(id, this);
		this.children.add(child);
		return child;
	}

	dispose(): void {
		if (this._disposed) {
			return;
		}
		// 先销毁所有子作用域
		for (const child of this.children) {
			child.dispose();
		}
		this.children.clear();
		this.registry.clear();
		this._disposed = true;
	}

	private ensureNotDisposed(): void {
		if (this._disposed) {
			throw new LoaderError(
				`Scope "${this.id}" has been disposed`,
				LoaderErrorCode.ScopeDisposed,
				{ scopeId: this.id },
			);
		}
	}
}
