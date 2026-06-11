import type { TreeNodeType } from "../../interfaces/ISharedTree.js";

/** 创建节点操作。 */
export interface ICreateNodeOp {
	readonly action: "createNode";
	readonly nodeId: string;
	readonly nodeType: TreeNodeType | string;
	readonly value?: string | number | boolean | null;
}

/** 删除节点操作。 */
export interface IDeleteNodeOp {
	readonly action: "deleteNode";
	readonly nodeId: string;
}

/** 设置 Object 节点属性操作。 */
export interface ISetPropertyOp {
	readonly action: "setProperty";
	readonly nodeId: string;
	readonly key: string;
	readonly childNodeId: string;
}

/** 删除 Object 节点属性操作。 */
export interface IDeletePropertyOp {
	readonly action: "deleteProperty";
	readonly nodeId: string;
	readonly key: string;
}

/** 在 Array 节点中插入子节点操作。 */
export interface IInsertChildOp {
	readonly action: "insertChild";
	readonly parentId: string;
	readonly index: number;
	readonly childNodeId: string;
}

/** 从 Array 节点中移除子节点操作。 */
export interface IRemoveChildOp {
	readonly action: "removeChild";
	readonly parentId: string;
	readonly childNodeId: string;
}

/** 设置叶节点值操作。 */
export interface ISetValueOp {
	readonly action: "setValue";
	readonly nodeId: string;
	readonly value: string | number | boolean | null;
}

/** 移动节点操作。 */
export interface IMoveNodeOp {
	readonly action: "moveNode";
	readonly nodeId: string;
	readonly newParentId: string;
	readonly key?: string;
	readonly index?: number;
}

/** 单个树操作的联合类型。 */
export type ITreeOp =
	| ICreateNodeOp
	| IDeleteNodeOp
	| ISetPropertyOp
	| IDeletePropertyOp
	| IInsertChildOp
	| IRemoveChildOp
	| ISetValueOp
	| IMoveNodeOp;

/** 批量操作（事务提交格式）。 */
export interface ITreeBatchOp {
	readonly action: "batch";
	readonly ops: readonly ITreeOp[];
	readonly transactionId: string;
}

/** SharedTree 操作的完整类型。 */
export type ISharedTreeOp = ITreeOp | ITreeBatchOp;
