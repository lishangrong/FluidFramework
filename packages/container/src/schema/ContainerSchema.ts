import type { IContainerSchema } from "../interfaces/IContainerSchema.js";
import { SchemaError } from "../errors/SchemaError.js";
import { ContainerErrorCode } from "../errors/ContainerErrorCode.js";

/**
 * 容器模式定义。
 * 不可变值对象，声明容器创建时的初始对象和可动态创建的对象类型。
 */
export class ContainerSchema {
	public readonly initialObjects: ReadonlyMap<string, string>;
	public readonly dynamicObjectTypes: readonly string[];

	constructor(schema: IContainerSchema) {
		this.validateSchema(schema);
		this.initialObjects = new Map(Object.entries(schema.initialObjects));
		this.dynamicObjectTypes = schema.dynamicObjectTypes
			? [...schema.dynamicObjectTypes]
			: [];
	}

	/**
	 * 检查指定类型是否可动态创建。
	 */
	isDynamicTypeAllowed(type: string): boolean {
		return this.dynamicObjectTypes.includes(type);
	}

	/**
	 * 获取初始对象的类型。
	 */
	getInitialObjectType(name: string): string | undefined {
		return this.initialObjects.get(name);
	}

	/**
	 * 转换为接口格式。
	 */
	toJSON(): IContainerSchema {
		return {
			initialObjects: Object.fromEntries(this.initialObjects),
			dynamicObjectTypes: [...this.dynamicObjectTypes],
		};
	}

	/**
	 * 验证 schema 的基本合法性。
	 */
	private validateSchema(schema: IContainerSchema): void {
		if (!schema.initialObjects || typeof schema.initialObjects !== "object") {
			throw new SchemaError(
				"initialObjects 必须是非空对象",
				ContainerErrorCode.InvalidSchema,
			);
		}

		const keys = Object.keys(schema.initialObjects);
		if (keys.length === 0) {
			throw new SchemaError(
				"initialObjects 必须包含至少一个条目",
				ContainerErrorCode.InvalidSchema,
			);
		}

		for (const [key, type] of Object.entries(schema.initialObjects)) {
			if (!key || typeof key !== "string") {
				throw new SchemaError(
					"initialObjects 的键必须是非空字符串",
					ContainerErrorCode.InvalidSchema,
					{ key },
				);
			}
			if (!type || typeof type !== "string") {
				throw new SchemaError(
					`initialObjects["${key}"] 的类型必须是非空字符串`,
					ContainerErrorCode.InvalidSchema,
					{ key, type },
				);
			}
		}

		if (schema.dynamicObjectTypes) {
			for (const type of schema.dynamicObjectTypes) {
				if (!type || typeof type !== "string") {
					throw new SchemaError(
						"dynamicObjectTypes 中的每个类型必须是非空字符串",
						ContainerErrorCode.InvalidSchema,
						{ type },
					);
				}
			}
		}
	}
}
