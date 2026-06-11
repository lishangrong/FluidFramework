/**
 * 隔离的执行作用域。
 * 每个 Scope 持有独立的服务注册表，支持层级查找。
 */
export interface IScope {
	readonly id: string;
	readonly parent?: IScope;
	readonly disposed: boolean;

	register<T>(key: string, value: T): void;
	resolve<T>(key: string): T | undefined;
	has(key: string): boolean;
	createChild(id?: string): IScope;
	dispose(): void;
}
