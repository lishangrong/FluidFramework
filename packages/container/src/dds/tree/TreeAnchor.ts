import type { ITreeNodeView } from "../../interfaces/ISharedTree.js";
import { DdsError } from "../../errors/DdsError.js";
import { ContainerErrorCode } from "../../errors/ContainerErrorCode.js";

/**
 * 树锚点。
 * 基于节点 ID 的稳定位置引用，即使树结构变化也能追踪目标节点。
 */
export class TreeAnchor {
	public readonly nodeId: string;
	private _disposed: boolean = false;
	private readonly _resolve: (nodeId: string) => ITreeNodeView | undefined;
	private readonly _onDispose: (anchor: TreeAnchor) => void;

	constructor(
		nodeId: string,
		resolver: (nodeId: string) => ITreeNodeView | undefined,
		onDispose: (anchor: TreeAnchor) => void,
	) {
		this.nodeId = nodeId;
		this._resolve = resolver;
		this._onDispose = onDispose;
	}

	/**
	 * 解析锚点，返回节点视图。
	 * 节点已删除时返回 undefined。
	 */
	resolve(): ITreeNodeView | undefined {
		if (this._disposed) {
			throw new DdsError(
				"锚点已释放",
				ContainerErrorCode.TreeAnchorDisposed,
				{ nodeId: this.nodeId },
			);
		}
		const view = this._resolve(this.nodeId);
		if (view && view.deleted) {
			return undefined;
		}
		return view;
	}

	/**
	 * 释放锚点。
	 */
	dispose(): void {
		if (this._disposed) return;
		this._disposed = true;
		this._onDispose(this);
	}

	get disposed(): boolean {
		return this._disposed;
	}
}
