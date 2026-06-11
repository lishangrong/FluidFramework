import { ContainerSchema } from "./ContainerSchema.js";
import { SchemaError } from "../errors/SchemaError.js";
import { ContainerErrorCode } from "../errors/ContainerErrorCode.js";

/**
 * Schema 验证器。
 * 校验 schema 中声明的 DDS 类型是否已在工厂中注册。
 */
export class SchemaValidator {
	/**
	 * 验证 schema 中引用的所有 DDS 类型都已注册。
	 */
	static validate(schema: ContainerSchema, registeredTypes: ReadonlySet<string>): void {
		// 验证初始对象中的类型
		for (const [name, type] of schema.initialObjects) {
			if (!registeredTypes.has(type)) {
				throw new SchemaError(
					`初始对象 "${name}" 的类型 "${type}" 未注册`,
					ContainerErrorCode.UnknownDdsType,
					{ name, type },
				);
			}
		}

		// 验证动态对象类型
		for (const type of schema.dynamicObjectTypes) {
			if (!registeredTypes.has(type)) {
				throw new SchemaError(
					`动态对象类型 "${type}" 未注册`,
					ContainerErrorCode.UnknownDdsType,
					{ type },
				);
			}
		}
	}
}
