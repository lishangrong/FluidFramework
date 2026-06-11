import type { ISnapshotTree } from "../interfaces/IDocumentService.js";
import type { IBinarySerializer } from "../interfaces/ISerializer.js";
import type { ContainerRuntime } from "../runtime/ContainerRuntime.js";
import type { ContainerSchema } from "../schema/ContainerSchema.js";
/**
 * 快照构建器。
 * 将容器运行时的状态构建为 ISnapshotTree 格式。
 */
export declare class SnapshotBuilder {
    /**
     * 构建容器状态的快照树。
     *
     * 树结构：
     * - root.blobs: 元数据（schema、序列号等）
     * - root.trees: 每个 DDS 对象一棵子树，包含其二进制快照
     */
    static build(containerId: string, runtime: ContainerRuntime, schema: ContainerSchema, serializer: IBinarySerializer): ISnapshotTree;
}
//# sourceMappingURL=SnapshotBuilder.d.ts.map