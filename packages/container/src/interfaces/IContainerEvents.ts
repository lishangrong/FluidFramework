/**
 * 容器生命周期事件。
 */
export interface IContainerEvents {
	[key: string]: (...args: any[]) => void;
	/** 容器首次创建时触发。 */
	onCreate: () => void;
	/** 容器从已有数据加载时触发。 */
	onLoad: () => void;
	/** 容器销毁时触发，用于资源清理。 */
	onDispose: () => void;
	/** DDS 数据变更时触发。 */
	changed: (event: { objectId: string; type: string }) => void;
	/** 错误事件。 */
	error: (error: Error) => void;
	/** 连接建立时触发。 */
	connected: (clientId: string) => void;
	/** 连接断开时触发。 */
	disconnected: (reason: string) => void;
}
