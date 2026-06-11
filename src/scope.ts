/**
 * Fluid Loader - Scope Manager
 *
 * Manages isolated execution scopes for code modules using Proxy-based
 * sandboxing to prevent global state pollution between modules.
 */

import type { IScopeContext, IScopeManager } from "./types";
import { ScopeError } from "./errors";

/**
 * Concrete implementation of IScopeManager.
 *
 * Each scope maintains its own variable store and can optionally
 * inherit from a parent scope (scope chain). The executeInScope
 * method provides a Proxy-wrapped context that intercepts global
 * variable access and redirects it to the scope-local store.
 */
export class ScopeManager implements IScopeManager {
  private readonly scopes = new Map<string, IScopeContext>();

  createScope(name: string, parentScope?: string): IScopeContext {
    if (this.scopes.has(name)) {
      throw new ScopeError(`Scope "${name}" already exists`, name);
    }

    if (parentScope && !this.scopes.has(parentScope)) {
      throw new ScopeError(
        `Parent scope "${parentScope}" does not exist`,
        name,
      );
    }

    const context: IScopeContext = {
      name,
      variables: new Map(),
      parentScope,
      createdAt: Date.now(),
    };

    this.scopes.set(name, context);
    return context;
  }

  getScope(name: string): IScopeContext | undefined {
    return this.scopes.get(name);
  }

  executeInScope<T>(name: string, fn: (scope: IScopeContext) => T): T {
    const context = this.scopes.get(name);
    if (!context) {
      throw new ScopeError(`Scope "${name}" does not exist`, name);
    }

    // Create a scope-aware variables wrapper that supports parent chain reads
    // but delegates writes directly to the underlying Map (avoiding Proxy-on-Map issues).
    const scopeAwareVariables = this.createScopeAwareVariables(context);

    // Proxy the context to intercept only the "variables" property
    const proxiedContext = new Proxy(context, {
      get: (target, prop, receiver) => {
        if (prop === "variables") {
          return scopeAwareVariables;
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    return fn(proxiedContext);
  }

  destroyScope(name: string): boolean {
    // Also destroy child scopes that depend on this scope
    const dependents = this.findDependentScopes(name);
    for (const dep of dependents) {
      this.scopes.delete(dep);
    }
    return this.scopes.delete(name);
  }

  listScopes(): string[] {
    return Array.from(this.scopes.keys());
  }

  /**
   * Get a variable value by walking the scope chain.
   */
  resolveVariable(scopeName: string, key: string): unknown {
    let current: IScopeContext | undefined = this.scopes.get(scopeName);

    while (current) {
      if (current.variables.has(key)) {
        return current.variables.get(key);
      }
      current = current.parentScope
        ? this.scopes.get(current.parentScope)
        : undefined;
    }

    return undefined;
  }

  /**
   * Set a variable in a specific scope.
   */
  setVariable(scopeName: string, key: string, value: unknown): void {
    const scope = this.scopes.get(scopeName);
    if (!scope) {
      throw new ScopeError(`Scope "${scopeName}" does not exist`, scopeName);
    }
    scope.variables.set(key, value);
  }

  /**
   * Create a scope-aware variables wrapper that supports parent chain reads
   * but delegates writes directly to the underlying Map.
   * Uses a plain object (not Proxy on Map) to avoid Map internal slot issues.
   */
  private createScopeAwareVariables(context: IScopeContext): Map<string, unknown> {
    const localVars = context.variables;
    const self = this;

    // Create a wrapper that mimics Map interface but chains parent lookups for reads
    const wrapper = {
      get(key: string): unknown {
        if (localVars.has(key)) {
          return localVars.get(key);
        }
        return self.resolveFromParent(context.parentScope, key);
      },
      set(key: string, value: unknown): Map<string, unknown> {
        localVars.set(key, value);
        return wrapper as unknown as Map<string, unknown>;
      },
      has(key: string): boolean {
        if (localVars.has(key)) return true;
        return self.hasInParent(context.parentScope, key);
      },
      delete(key: string): boolean {
        return localVars.delete(key);
      },
      clear(): void {
        localVars.clear();
      },
      get size(): number {
        return localVars.size;
      },
      forEach(
        callbackfn: (value: unknown, key: string, map: Map<string, unknown>) => void,
      ): void {
        localVars.forEach(callbackfn);
      },
      keys(): IterableIterator<string> {
        return localVars.keys();
      },
      values(): IterableIterator<unknown> {
        return localVars.values();
      },
      entries(): IterableIterator<[string, unknown]> {
        return localVars.entries();
      },
      [Symbol.iterator](): IterableIterator<[string, unknown]> {
        return localVars[Symbol.iterator]();
      },
      get [Symbol.toStringTag](): string {
        return "Map";
      },
    };

    return wrapper as unknown as Map<string, unknown>;
  }

  private resolveFromParent(
    parentName: string | undefined,
    key: string,
  ): unknown {
    if (!parentName) return undefined;
    return this.resolveVariable(parentName, key);
  }

  private hasInParent(parentName: string | undefined, key: string): boolean {
    if (!parentName) return false;
    let current: IScopeContext | undefined = this.scopes.get(parentName);
    while (current) {
      if (current.variables.has(key)) return true;
      current = current.parentScope
        ? this.scopes.get(current.parentScope)
        : undefined;
    }
    return false;
  }

  private findDependentScopes(scopeName: string): string[] {
    const dependents: string[] = [];
    for (const [name, ctx] of this.scopes) {
      if (ctx.parentScope === scopeName) {
        dependents.push(name, ...this.findDependentScopes(name));
      }
    }
    return dependents;
  }
}
