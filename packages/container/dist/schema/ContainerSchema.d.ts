import type { IContainerSchema } from "../interfaces/IContainerSchema.js";
/**
 * 容器模式定义。
 * 不可变值对象，声明容器创建时的初始对象和可动态创建的对象类型。
 */
export declare class ContainerSchema {
    readonly initialObjects: ReadonlyMap<string, string>;
    readonly dynamicObjectTypes: readonly string[];
    constructor(schema: IContainerSchema);
    /**
     * 检查指定类型是否可动态创建。
     */
    isDynamicTypeAllowed(type: string): boolean;
    /**
     * 获取初始对象的类型。
     */
    getInitialObjectType(name: string): string | undefined;
    /**
     * 转换为接口格式。
     */
    toJSON(): IContainerSchema;
    /**
     * 验证 schema 的基本合法性。
     */
    private validateSchema;
}
//# sourceMappingURL=ContainerSchema.d.ts.map