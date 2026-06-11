import type { ISharedObject } from "./IDds.js";

/**
 * 树节点类型枚举。
 */
export enum TreeNodeType {
	Object = "object",
	Array = "array",
	String = "string",
	Number = "number",
	Boolean = "boolean",
	Null = "null",
}

/**
 * 树节点的只读视图。
 */
export interface ITreeNodeView {
	readonly id: string;
	readonly type: TreeNodeType | string;
	readonly parentId: string | null;
	readonly parentKey: string | null;
	readonly deleted: boolean;
	/** Object 节点的属性映射（key -> childNodeId）。 */
	readonly properties?: ReadonlyMap<string, string>;
	/** Array 节点的有序子节点 ID 列表。 */
	readonly children?: readonly string[];
	/** 叶节点的值。 */
	readonly value?: string | number | boolean | null;
}

/**
 * 树锚点接口。
 * 提供基于节点 ID 的稳定位置引用。
 */
export interface ITreeAnchor {
	readonly nodeId: string;
	/** 解析锚点，返回节点视图。节点已删除时返回 undefined。 */
	resolve(): ITreeNodeView | undefined;
	/** 释放锚点。 */
	dispose(): void;
}

/**
 * 树事务接口。
 * 将多个操作打包为原子操作提交。
 */
export interface ITreeTransaction {
	readonly ended: boolean;
	/** 创建节点。 */
	createNode(type: TreeNodeType | string, value?: string | number | boolean | null): string;
	/** 删除节点。 */
	deleteNode(nodeId: string): void;
	/** 设置 Object 节点属性。 */
	setProperty(nodeId: string, key: string, childNodeId: string): void;
	/** 删除 Object 节点属性。 */
	deleteProperty(nodeId: string, key: string): void;
	/** 在 Array 节点指定位置插入子节点。 */
	insertChild(parentId: string, index: number, childNodeId: string): void;
	/** 从 Array 节点移除子节点。 */
	removeChild(parentId: string, childNodeId: string): void;
	/** 设置叶节点值。 */
	setValue(nodeId: string, value: string | number | boolean | null): void;
	/** 移动节点到新父节点。 */
	moveNode(nodeId: string, newParentId: string, key?: string, index?: number): void;
	/** 提交事务。 */
	commit(): void;
	/** 回滚事务。 */
	rollback(): void;
}

/**
 * 共享树数据结构接口。
 */
export interface ISharedTree extends ISharedObject {
	/** 根节点 ID。 */
	readonly rootId: string;

	// ---- 节点查询 ----
	/** 获取节点视图。 */
	getNode(nodeId: string): ITreeNodeView | undefined;
	/** 获取节点数量（不含 tombstone）。 */
	getNodeCount(): number;

	// ---- 节点创建 ----
	/** 创建 Object 节点。 */
	createObjectNode(): string;
	/** 创建 Array 节点。 */
	createArrayNode(): string;
	/** 创建叶节点。 */
	createLeafNode(type: TreeNodeType.String | TreeNodeType.Number | TreeNodeType.Boolean | TreeNodeType.Null, value: string | number | boolean | null): string;

	// ---- Object 节点操作 ----
	/** 设置 Object 节点属性（关联子节点）。 */
	setProperty(nodeId: string, key: string, childNodeId: string): void;
	/** 删除 Object 节点属性。 */
	deleteProperty(nodeId: string, key: string): void;
	/** 获取 Object 节点属性值（子节点 ID）。 */
	getProperty(nodeId: string, key: string): string | undefined;
	/** 获取 Object 节点所有属性。 */
	getProperties(nodeId: string): ReadonlyMap<string, string>;

	// ---- Array 节点操作 ----
	/** 在 Array 节点指定位置插入子节点。 */
	insertChild(parentId: string, index: number, childNodeId: string): void;
	/** 从 Array 节点移除子节点。 */
	removeChild(parentId: string, childNodeId: string): void;
	/** 获取 Array 节点指定位置的子节点 ID。 */
	getChild(parentId: string, index: number): string | undefined;
	/** 获取 Array 节点所有子节点 ID。 */
	getChildren(parentId: string): readonly string[];
	/** 获取 Array 节点子节点数量。 */
	getChildCount(parentId: string): number;

	// ---- 叶节点操作 ----
	/** 设置叶节点值。 */
	setValue(nodeId: string, value: string | number | boolean | null): void;
	/** 获取叶节点值。 */
	getValue(nodeId: string): string | number | boolean | null | undefined;

	// ---- 通用操作 ----
	/** 删除节点及其所有后代。 */
	deleteNode(nodeId: string): void;
	/** 移动节点到新父节点。 */
	moveNode(nodeId: string, newParentId: string, key?: string, index?: number): void;

	// ---- 事务 ----
	/** 开启事务。 */
	startTransaction(): ITreeTransaction;

	// ---- 锚点 ----
	/** 创建锚点。 */
	createAnchor(nodeId: string): ITreeAnchor;

	// ---- 自定义类型 ----
	/** 注册自定义节点类型。 */
	registerCustomType(typeName: string): void;
}
