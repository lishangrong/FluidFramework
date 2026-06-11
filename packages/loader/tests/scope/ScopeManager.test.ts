import { describe, it, expect } from "vitest";
import { ScopeManager } from "../../src/scope/ScopeManager.js";
import { ScopeContext } from "../../src/scope/ScopeContext.js";
import { LoaderError } from "../../src/errors/LoaderError.js";

describe("ScopeContext", () => {
	it("should register and resolve service", () => {
		const scope = new ScopeContext("test");
		scope.register("logger", { log: () => {} });

		const resolved = scope.resolve<{ log: () => void }>("logger");
		expect(resolved).toBeDefined();
		expect(typeof resolved!.log).toBe("function");
	});

	it("should resolve service from parent scope", () => {
		const parent = new ScopeContext("parent");
		parent.register("shared", "shared-value");

		const child = parent.createChild("child");
		expect(child.resolve("shared")).toBe("shared-value");
	});

	it("should shadow parent registration", () => {
		const parent = new ScopeContext("parent");
		parent.register("key", "parent-value");

		const child = parent.createChild("child");
		child.register("key", "child-value");

		expect(child.resolve("key")).toBe("child-value");
		expect(parent.resolve("key")).toBe("parent-value");
	});

	it("has() should only check local scope", () => {
		const parent = new ScopeContext("parent");
		parent.register("parentOnly", true);

		const child = parent.createChild("child");
		expect(child.has("parentOnly")).toBe(false);
		expect(child.resolve("parentOnly")).toBe(true);
	});

	it("should dispose and prevent further use", () => {
		const scope = new ScopeContext("test");
		scope.register("a", 1);
		scope.dispose();

		expect(scope.disposed).toBe(true);
		expect(() => scope.register("b", 2)).toThrow(LoaderError);
		expect(() => scope.createChild()).toThrow(LoaderError);
	});

	it("should cascade dispose to children", () => {
		const parent = new ScopeContext("parent");
		const child = parent.createChild("child");
		const grandchild = child.createChild("grandchild");

		parent.dispose();

		expect(parent.disposed).toBe(true);
		expect(child.disposed).toBe(true);
		expect(grandchild.disposed).toBe(true);
	});
});

describe("ScopeManager", () => {
	it("should have root scope after construction", () => {
		const manager = new ScopeManager();
		expect(manager.rootScope).toBeDefined();
		expect(manager.rootScope.id).toBe("root");
	});

	it("should create scope as child of root", () => {
		const manager = new ScopeManager();
		const scope = manager.createScope("container-1");

		expect(scope.id).toBe("container-1");
		expect(manager.getScope("container-1")).toBe(scope);
	});

	it("should create scope with custom parent", () => {
		const manager = new ScopeManager();
		const parent = manager.createScope("parent");
		parent.register("parentService", "pv");

		const child = manager.createScope("child", parent);
		expect(child.resolve("parentService")).toBe("pv");
	});

	it("should throw on duplicate scope ID", () => {
		const manager = new ScopeManager();
		manager.createScope("s1");

		expect(() => manager.createScope("s1")).toThrow(LoaderError);
	});

	it("should destroy scope", () => {
		const manager = new ScopeManager();
		const scope = manager.createScope("s1");

		manager.destroyScope("s1");

		expect(manager.getScope("s1")).toBeUndefined();
		expect(scope.disposed).toBe(true);
	});

	it("should return undefined for non-existent scope", () => {
		const manager = new ScopeManager();
		expect(manager.getScope("nonexistent")).toBeUndefined();
	});
});
