import { ContainerSchema } from "./ContainerSchema.js";
/**
 * Schema 验证器。
 * 校验 schema 中声明的 DDS 类型是否已在工厂中注册。
 */
export declare class SchemaValidator {
    /**
     * 验证 schema 中引用的所有 DDS 类型都已注册。
     */
    static validate(schema: ContainerSchema, registeredTypes: ReadonlySet<string>): void;
}
//# sourceMappingURL=SchemaValidator.d.ts.map