import type { ISnapshotManager, ISnapshotResult } from "../interfaces/ISnapshot.js";
import type { ISnapshotTree } from "../interfaces/IDocumentService.js";
import type { IBinarySerializer } from "../interfaces/ISerializer.js";
import type { ContainerRuntime } from "../runtime/ContainerRuntime.js";
import type { ContainerSchema } from "../schema/ContainerSchema.js";
import { SnapshotBuilder } from "./SnapshotBuilder.js";
import { SnapshotError } from "../errors/SnapshotError.js";
import { ContainerErrorCode } from "../errors/ContainerErrorCode.js";

/**
 * 快照管理器。
 * 负责创建容器状态快照和从快照恢复容器状态。
 */
export class SnapshotManager implements ISnapshotManager {
	private readonly runtime: ContainerRuntime;
	private readonly schema: ContainerSchema;
	private readonly serializer: IBinarySerializer;

	constructor(
		runtime: ContainerRuntime,
		schema: ContainerSchema,
		serializer: IBinarySerializer,
	) {
		this.runtime = runtime;
		this.schema = schema;
		this.serializer = serializer;
	}

	/**
	 * 创建当前容器状态的快照。
	 * 将所有 DDS 状态序列化为 ISnapshotTree 和二进制数据。
	 */
	async createSnapshot(containerId: string): Promise<ISnapshotResult> {
		try {
			const tree = SnapshotBuilder.build(
				containerId,
				this.runtime,
				this.schema,
				this.serializer,
			);

			// 将整棵快照树编码为二进制数据
			const binaryData = this.serializer.encode(
				serializableTree(tree),
			);

			return {
				containerId,
				sequenceNumber: this.runtime.getLastSequenceNumber(),
				timestamp: Date.now(),
				tree,
				binaryData,
			};
		} catch (error) {
			if (error instanceof SnapshotError) {
				throw error;
			}
			throw new SnapshotError(
				"创建快照失败",
				ContainerErrorCode.SnapshotFailed,
				{ containerId },
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}

	/**
	 * 从快照恢复容器状态。
	 * 解析快照树并将各 DDS 的快照数据加载到对应实例。
	 */
	async restoreFromSnapshot(snapshot: ISnapshotResult): Promise<void> {
		try {
			const { tree } = snapshot;
			const ddsSnapshots = new Map<string, Uint8Array>();

			// 从子树中提取各 DDS 的快照数据
			for (const [objectId, subTree] of Object.entries(tree.trees)) {
				const blobData = subTree.blobs["content"];
				if (blobData) {
					ddsSnapshots.set(objectId, decodeBase64(blobData));
				}
			}

			this.runtime.loadAll(ddsSnapshots);
		} catch (error) {
			if (error instanceof SnapshotError) {
				throw error;
			}
			throw new SnapshotError(
				"从快照恢复失败",
				ContainerErrorCode.SnapshotRestoreFailed,
				{ containerId: snapshot.containerId },
				error instanceof Error ? error : new Error(String(error)),
			);
		}
	}
}

/**
 * 将 ISnapshotTree 转换为可序列化的普通对象。
 */
function serializableTree(
	tree: ISnapshotTree,
): Record<string, unknown> {
	const trees: Record<string, unknown> = {};
	for (const [key, subTree] of Object.entries(tree.trees)) {
		trees[key] = serializableTree(subTree);
	}
	return {
		id: tree.id,
		blobs: tree.blobs,
		trees,
	};
}

/**
 * 将 Base64 字符串解码为 Uint8Array。
 */
function decodeBase64(data: string): Uint8Array {
	return new Uint8Array(Buffer.from(data, "base64"));
}
