import type { IScope } from "./IScope.js";

/**
 * 管理作用域生命周期的管理器。
 */
export interface IScopeManager {
	readonly rootScope: IScope;
	createScope(scopeId: string, parentScope?: IScope): IScope;
	destroyScope(scopeId: string): void;
	getScope(scopeId: string): IScope | undefined;
}
