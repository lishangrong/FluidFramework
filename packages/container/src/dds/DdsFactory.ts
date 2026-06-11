import { SharedObjectBase } from "./SharedObjectBase.js";
import { SharedMap } from "./SharedMap.js";
import { SharedString } from "./SharedString.js";
import { SharedCounter } from "./SharedCounter.js";
import { SharedTree } from "./SharedTree.js";
import { SchemaError } from "../errors/SchemaError.js";
import { ContainerErrorCode } from "../errors/ContainerErrorCode.js";
import { DdsError } from "../errors/DdsError.js";

/** DDS 构造函数类型。 */
type DdsConstructor = (id: string) => SharedObjectBase;

/**
 * DDS 工厂。
 * 管理类型字符串到构造函数的映射，用于根据 schema 创建 DDS 实例。
 */
export class DdsFactory {
	private readonly factories = new Map<string, DdsConstructor>();

	constructor() {
		// 预注册内置 DDS 类型
		this.register(SharedMap.TYPE, (id) => new SharedMap(id));
		this.register(SharedString.TYPE, (id) => new SharedString(id));
		this.register(SharedCounter.TYPE, (id) => new SharedCounter(id));
		this.register(SharedTree.TYPE, (id) => new SharedTree(id));
	}

	/**
	 * 注册新的 DDS 类型。
	 */
	register(type: string, factory: DdsConstructor): void {
		if (this.factories.has(type)) {
			throw new DdsError(
				`DDS 类型 "${type}" 已注册`,
				ContainerErrorCode.DdsAlreadyExists,
				{ type },
			);
		}
		this.factories.set(type, factory);
	}

	/**
	 * 根据类型字符串创建 DDS 实例。
	 */
	create(type: string, id: string): SharedObjectBase {
		const factory = this.factories.get(type);
		if (!factory) {
			throw new SchemaError(
				`未知的 DDS 类型: "${type}"`,
				ContainerErrorCode.UnknownDdsType,
				{ type },
			);
		}
		return factory(id);
	}

	/**
	 * 获取所有已注册的类型。
	 */
	getRegisteredTypes(): ReadonlySet<string> {
		return new Set(this.factories.keys());
	}

	/**
	 * 检查类型是否已注册。
	 */
	hasType(type: string): boolean {
		return this.factories.has(type);
	}
}
