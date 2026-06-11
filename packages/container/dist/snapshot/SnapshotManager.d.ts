import type { ISnapshotManager, ISnapshotResult } from "../interfaces/ISnapshot.js";
import type { IBinarySerializer } from "../interfaces/ISerializer.js";
import type { ContainerRuntime } from "../runtime/ContainerRuntime.js";
import type { ContainerSchema } from "../schema/ContainerSchema.js";
/**
 * 快照管理器。
 * 负责创建容器状态快照和从快照恢复容器状态。
 */
export declare class SnapshotManager implements ISnapshotManager {
    private readonly runtime;
    private readonly schema;
    private readonly serializer;
    constructor(runtime: ContainerRuntime, schema: ContainerSchema, serializer: IBinarySerializer);
    /**
     * 创建当前容器状态的快照。
     * 将所有 DDS 状态序列化为 ISnapshotTree 和二进制数据。
     */
    createSnapshot(containerId: string): Promise<ISnapshotResult>;
    /**
     * 从快照恢复容器状态。
     * 解析快照树并将各 DDS 的快照数据加载到对应实例。
     */
    restoreFromSnapshot(snapshot: ISnapshotResult): Promise<void>;
}
//# sourceMappingURL=SnapshotManager.d.ts.map