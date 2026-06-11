import type { IContainer, IContainerConfig } from "../interfaces/IContainer.js";
import type { IContainerEvents } from "../interfaces/IContainerEvents.js";
import type { IContainerSchema } from "../interfaces/IContainerSchema.js";
import type { ISharedObject } from "../interfaces/IDds.js";
import type { ISnapshotResult } from "../interfaces/ISnapshot.js";
import type {
	IDocumentService,
	IDeltaStorageService,
	IDocumentStorageService,
} from "../interfaces/IDocumentService.js";
import { TypedEventEmitter } from "../utils/EventEmitter.js";
import { ContainerSchema } from "../schema/ContainerSchema.js";
import { SchemaValidator } from "../schema/SchemaValidator.js";
import { ContainerRuntime } from "../runtime/ContainerRuntime.js";
import { SnapshotManager } from "../snapshot/SnapshotManager.js";
import { BinarySerializer } from "../serialization/BinarySerializer.js";
import { DdsFactory } from "../dds/DdsFactory.js";
import { ContainerError } from "../errors/ContainerError.js";
import { ContainerErrorCode } from "../errors/ContainerErrorCode.js";

/**
 * Fluid 容器。
 * 组合 schema、运行时、快照管理器等模块，提供统一的数据模型管理能力。
 */
export class Container
	extends TypedEventEmitter<IContainerEvents>
	implements IContainer
{
	public readonly id: string;
	public readonly schema: IContainerSchema;
	private readonly _schema: ContainerSchema;
	private readonly runtime: ContainerRuntime;
	private readonly snapshotManager: SnapshotManager;
	private readonly serializer: BinarySerializer;
	private readonly initialObjectNames: Map<string, string>;
	private _disposed = false;

	// 文档服务连接
	private deltaStorage?: IDeltaStorageService;
	private documentStorage?: IDocumentStorageService;

	private constructor(config: IContainerConfig) {
		super();
		this.id = config.containerId;
		this.serializer = (config.serializer as BinarySerializer) ?? new BinarySerializer();

		// 初始化 schema
		this._schema = new ContainerSchema(config.schema);
		this.schema = config.schema;
		this.initialObjectNames = new Map<string, string>();

		// 初始化运行时
		const factory = new DdsFactory();
		SchemaValidator.validate(this._schema, factory.getRegisteredTypes());
		this.runtime = new ContainerRuntime(this.id, factory);

		// 初始化快照管理器
		this.snapshotManager = new SnapshotManager(
			this.runtime,
			this._schema,
			this.serializer,
		);
	}

	get disposed(): boolean {
		return this._disposed;
	}

	/**
	 * 创建新容器。
	 * 实例化所有初始对象，触发 onCreate 事件。
	 */
	static async create(config: IContainerConfig): Promise<Container> {
		const container = new Container(config);
		await container.connectServices(config.documentService, config.resolvedUrl.endpoints);
		container.createInitialObjects();
		container.safeEmit("onCreate");
		return container;
	}

	/**
	 * 加载已有容器。
	 * 从存储服务加载快照并恢复状态，触发 onLoad 事件。
	 */
	static async load(config: IContainerConfig): Promise<Container> {
		const container = new Container(config);
		await container.connectServices(config.documentService, config.resolvedUrl.endpoints);

		// 创建初始对象的 DDS 实例（空状态）
		container.createInitialObjects();

		// 尝试从存储加载快照
		if (container.documentStorage) {
			const snapshotTree = await container.documentStorage.getSnapshotTree();
			if (snapshotTree) {
				const ddsSnapshots = new Map<string, Uint8Array>();
				for (const [objectId, subTree] of Object.entries(snapshotTree.trees)) {
					const blobData = subTree.blobs["content"];
					if (blobData) {
						ddsSnapshots.set(objectId, new Uint8Array(Buffer.from(blobData, "base64")));
					}
				}
				container.runtime.loadAll(ddsSnapshots);
			}
		}

		// 从增量存储追赶最新状态
		if (container.deltaStorage) {
			const messages = await container.deltaStorage.get(0, Number.MAX_SAFE_INTEGER);
			for (const msg of messages) {
				container.runtime.processRemoteOp(msg);
			}
		}

		container.safeEmit("onLoad");
		return container;
	}

	/**
	 * 获取初始对象中的 DDS 实例。
	 */
	getInitialObject<T extends ISharedObject>(name: string): T {
		this.ensureNotDisposed();
		const objectId = this.initialObjectNames.get(name);
		if (!objectId) {
			throw new ContainerError(
				`初始对象 "${name}" 不存在`,
				ContainerErrorCode.DdsNotFound,
				{ name },
			);
		}
		const obj = this.runtime.getObject<T>(objectId);
		if (!obj) {
			throw new ContainerError(
				`DDS 实例 "${objectId}" 未找到`,
				ContainerErrorCode.DdsNotFound,
				{ objectId },
			);
		}
		return obj;
	}

	/**
	 * 动态创建新的 DDS 实例。
	 * 类型必须在 schema 的 dynamicObjectTypes 中声明。
	 */
	async createDynamicObject<T extends ISharedObject>(
		type: string,
		id?: string,
	): Promise<T> {
		this.ensureNotDisposed();
		if (!this._schema.isDynamicTypeAllowed(type)) {
			throw new ContainerError(
				`类型 "${type}" 不在 dynamicObjectTypes 中，无法动态创建`,
				ContainerErrorCode.DynamicTypeNotRegistered,
				{ type },
			);
		}
		return this.runtime.createObject<T>(type, id);
	}

	/**
	 * 创建当前状态的快照。
	 */
	async snapshot(): Promise<ISnapshotResult> {
		this.ensureNotDisposed();
		return this.snapshotManager.createSnapshot(this.id);
	}

	/**
	 * 释放所有资源并销毁容器。
	 */
	dispose(): void {
		if (this._disposed) {
			return;
		}
		this._disposed = true;
		this.runtime.dispose();
		this.safeEmit("onDispose");
		this.removeAllListeners();
	}

	/**
	 * 创建 schema 中定义的所有初始对象。
	 */
	private createInitialObjects(): void {
		for (const [name, type] of this._schema.initialObjects) {
			const obj = this.runtime.createObject(type, name);
			this.initialObjectNames.set(name, obj.id);

			// 转发 DDS 的变更事件
			obj.on("changed", (event) => {
				this.safeEmit("changed", { objectId: event.objectId, type: event.type });
			});
		}
	}

	/**
	 * 连接文档服务。
	 */
	private async connectServices(
		documentService: IDocumentService,
		endpoints: { deltaStorage: string; orderer: string; storage: string },
	): Promise<void> {
		try {
			const [deltaStorage, documentStorage, orderer] = await Promise.all([
				documentService.connectToDeltaStorage(endpoints.deltaStorage),
				documentService.connectToStorage(endpoints.storage),
				documentService.connectToOrderer(endpoints.orderer),
			]);

			this.deltaStorage = deltaStorage;
			this.documentStorage = documentStorage;
			this.runtime.connectOrderer(orderer);

			this.safeEmit("connected", this.id);
		} catch (error) {
			throw new ContainerError(
				"连接文档服务失败",
				ContainerErrorCode.ConnectionFailed,
				{ containerId: this.id },
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * 确保容器未被销毁。
	 */
	private ensureNotDisposed(): void {
		if (this._disposed) {
			throw new ContainerError(
				"容器已被销毁",
				ContainerErrorCode.ContainerDisposed,
				{ containerId: this.id },
			);
		}
	}
}
