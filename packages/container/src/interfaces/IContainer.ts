import type { IContainerSchema } from "./IContainerSchema.js";
import type { IContainerEvents } from "./IContainerEvents.js";
import type { ISharedObject } from "./IDds.js";
import type { ISnapshotResult } from "./ISnapshot.js";
import type { IResolvedUrl } from "./IDocumentService.js";
import type { IBinarySerializer } from "./ISerializer.js";

/**
 * Fluid 容器主接口。
 */
export interface IContainer {
	readonly id: string;
	readonly disposed: boolean;
	readonly schema: IContainerSchema;

	/** 获取初始对象中的 DDS 实例。 */
	getInitialObject<T extends ISharedObject>(name: string): T;
	/** 动态创建新的 DDS 实例。 */
	createDynamicObject<T extends ISharedObject>(type: string, id?: string): Promise<T>;

	/** 创建当前状态的快照。 */
	snapshot(): Promise<ISnapshotResult>;

	/** 监听事件。 */
	on<K extends keyof IContainerEvents & string>(event: K, listener: IContainerEvents[K]): this;
	/** 取消监听事件。 */
	off<K extends keyof IContainerEvents & string>(event: K, listener: IContainerEvents[K]): this;

	/** 释放所有资源并销毁容器。 */
	dispose(): void;
}

/** 容器配置。 */
export interface IContainerConfig {
	readonly schema: IContainerSchema;
	readonly documentService: IDocumentService;
	readonly resolvedUrl: IResolvedUrl;
	readonly containerId: string;
	readonly serializer?: IBinarySerializer;
}

// 需要在此文件中直接引用 IDocumentService 类型
import type { IDocumentService } from "./IDocumentService.js";
