import type { IScopeManager } from "../interfaces/IScopeManager.js";
import type { IScope } from "../interfaces/IScope.js";
import { LoaderError } from "../errors/LoaderError.js";
import { LoaderErrorCode } from "../errors/LoaderErrorCode.js";
import { ScopeContext } from "./ScopeContext.js";

/**
 * 作用域管理器。管理所有活跃作用域的生命周期。
 */
export class ScopeManager implements IScopeManager {
	readonly rootScope: IScope;
	private readonly scopes = new Map<string, IScope>();

	constructor() {
		this.rootScope = new ScopeContext("root");
	}

	createScope(scopeId: string, parentScope?: IScope): IScope {
		if (this.scopes.has(scopeId)) {
			throw new LoaderError(
				`Scope "${scopeId}" already exists`,
				LoaderErrorCode.ScopeAlreadyExists,
				{ scopeId },
			);
		}

		const parent = parentScope ?? this.rootScope;
		const scope = parent.createChild(scopeId);
		this.scopes.set(scopeId, scope);
		return scope;
	}

	destroyScope(scopeId: string): void {
		const scope = this.scopes.get(scopeId);
		if (scope) {
			scope.dispose();
			this.scopes.delete(scopeId);
		}
	}

	getScope(scopeId: string): IScope | undefined {
		return this.scopes.get(scopeId);
	}
}
