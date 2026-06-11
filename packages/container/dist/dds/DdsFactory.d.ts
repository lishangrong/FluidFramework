import { SharedObjectBase } from "./SharedObjectBase.js";
/** DDS 构造函数类型。 */
type DdsConstructor = (id: string) => SharedObjectBase;
/**
 * DDS 工厂。
 * 管理类型字符串到构造函数的映射，用于根据 schema 创建 DDS 实例。
 */
export declare class DdsFactory {
    private readonly factories;
    constructor();
    /**
     * 注册新的 DDS 类型。
     */
    register(type: string, factory: DdsConstructor): void;
    /**
     * 根据类型字符串创建 DDS 实例。
     */
    create(type: string, id: string): SharedObjectBase;
    /**
     * 获取所有已注册的类型。
     */
    getRegisteredTypes(): ReadonlySet<string>;
    /**
     * 检查类型是否已注册。
     */
    hasType(type: string): boolean;
}
export {};
//# sourceMappingURL=DdsFactory.d.ts.map