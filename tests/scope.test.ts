import { ScopeManager } from "../src/scope";
import { ScopeError } from "../src/errors";

describe("ScopeManager", () => {
  let manager: ScopeManager;

  beforeEach(() => {
    manager = new ScopeManager();
  });

  describe("createScope", () => {
    it("should create a new scope", () => {
      const scope = manager.createScope("test");
      expect(scope.name).toBe("test");
      expect(scope.variables).toBeInstanceOf(Map);
      expect(scope.parentScope).toBeUndefined();
      expect(scope.createdAt).toBeGreaterThan(0);
    });

    it("should throw if scope already exists", () => {
      manager.createScope("test");
      expect(() => manager.createScope("test")).toThrow(ScopeError);
    });

    it("should create scope with parent", () => {
      manager.createScope("parent");
      const child = manager.createScope("child", "parent");
      expect(child.parentScope).toBe("parent");
    });

    it("should throw if parent scope does not exist", () => {
      expect(() => manager.createScope("child", "nonexistent")).toThrow(ScopeError);
    });
  });

  describe("getScope", () => {
    it("should return existing scope", () => {
      manager.createScope("test");
      const scope = manager.getScope("test");
      expect(scope).toBeDefined();
      expect(scope!.name).toBe("test");
    });

    it("should return undefined for nonexistent scope", () => {
      expect(manager.getScope("nope")).toBeUndefined();
    });
  });

  describe("executeInScope", () => {
    it("should execute function within scope", () => {
      manager.createScope("test");
      const result = manager.executeInScope("test", (scope) => {
        scope.variables.set("x", 42);
        return scope.variables.get("x");
      });
      expect(result).toBe(42);
    });

    it("should throw if scope does not exist", () => {
      expect(() => manager.executeInScope("nope", () => {})).toThrow(ScopeError);
    });

    it("should isolate variables between scopes", () => {
      manager.createScope("a");
      manager.createScope("b");

      manager.executeInScope("a", (scope) => {
        scope.variables.set("key", "from-a");
      });

      manager.executeInScope("b", (scope) => {
        scope.variables.set("key", "from-b");
      });

      const aScope = manager.getScope("a")!;
      const bScope = manager.getScope("b")!;
      expect(aScope.variables.get("key")).toBe("from-a");
      expect(bScope.variables.get("key")).toBe("from-b");
    });

    it("should resolve variables from parent scope via Proxy", () => {
      manager.createScope("parent");
      manager.createScope("child", "parent");

      manager.executeInScope("parent", (scope) => {
        scope.variables.set("inherited", "parent-value");
      });

      manager.executeInScope("child", (scope) => {
        // Child can read parent's variable through the Proxy
        const val = scope.variables.get("inherited");
        expect(val).toBe("parent-value");
      });
    });

    it("should shadow parent variables with child variables", () => {
      manager.createScope("parent");
      manager.createScope("child", "parent");

      manager.executeInScope("parent", (scope) => {
        scope.variables.set("key", "parent");
      });
      manager.executeInScope("child", (scope) => {
        scope.variables.set("key", "child");
        expect(scope.variables.get("key")).toBe("child");
      });
    });
  });

  describe("resolveVariable", () => {
    it("should walk the scope chain", () => {
      manager.createScope("grandparent");
      manager.createScope("parent", "grandparent");
      manager.createScope("child", "parent");

      const gp = manager.getScope("grandparent")!;
      gp.variables.set("deep", "found");

      expect(manager.resolveVariable("child", "deep")).toBe("found");
    });

    it("should return undefined for missing variables", () => {
      manager.createScope("test");
      expect(manager.resolveVariable("test", "missing")).toBeUndefined();
    });
  });

  describe("setVariable", () => {
    it("should set variable in scope", () => {
      manager.createScope("test");
      manager.setVariable("test", "key", "value");
      expect(manager.resolveVariable("test", "key")).toBe("value");
    });

    it("should throw for nonexistent scope", () => {
      expect(() => manager.setVariable("nope", "k", "v")).toThrow(ScopeError);
    });
  });

  describe("destroyScope", () => {
    it("should destroy an existing scope", () => {
      manager.createScope("test");
      expect(manager.destroyScope("test")).toBe(true);
      expect(manager.getScope("test")).toBeUndefined();
    });

    it("should return false for nonexistent scope", () => {
      expect(manager.destroyScope("nope")).toBe(false);
    });

    it("should destroy dependent child scopes", () => {
      manager.createScope("parent");
      manager.createScope("child", "parent");
      manager.createScope("grandchild", "child");

      manager.destroyScope("parent");

      expect(manager.getScope("parent")).toBeUndefined();
      expect(manager.getScope("child")).toBeUndefined();
      expect(manager.getScope("grandchild")).toBeUndefined();
    });
  });

  describe("listScopes", () => {
    it("should list all scope names", () => {
      manager.createScope("a");
      manager.createScope("b");
      manager.createScope("c");
      expect(manager.listScopes().sort()).toEqual(["a", "b", "c"]);
    });

    it("should return empty array when no scopes", () => {
      expect(manager.listScopes()).toEqual([]);
    });
  });
});
