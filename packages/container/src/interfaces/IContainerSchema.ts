/**
 * 容器模式定义。
 * 声明容器创建时自动实例化的初始对象和容器生命周期中可动态创建的对象类型。
 */
export interface IContainerSchema {
	/** 初始共享对象映射。键为对象名称，值为 DDS 类型标识。 */
	readonly initialObjects: Record<string, string>;
	/** 可动态创建的 DDS 类型标识列表。 */
	readonly dynamicObjectTypes?: readonly string[];
}
