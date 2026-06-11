/**
 * 快照构建器。
 * 将容器运行时的状态构建为 ISnapshotTree 格式。
 */
export class SnapshotBuilder {
    /**
     * 构建容器状态的快照树。
     *
     * 树结构：
     * - root.blobs: 元数据（schema、序列号等）
     * - root.trees: 每个 DDS 对象一棵子树，包含其二进制快照
     */
    static build(containerId, runtime, schema, serializer) {
        const ddsSnapshots = runtime.snapshotAll();
        const trees = {};
        // 为每个 DDS 创建子树
        for (const [objectId, snapshotData] of ddsSnapshots) {
            trees[objectId] = {
                id: objectId,
                blobs: {
                    content: encodeBase64(snapshotData),
                },
                trees: {},
            };
        }
        // 元数据 blob
        const metadata = {
            containerId,
            sequenceNumber: runtime.getLastSequenceNumber(),
            timestamp: Date.now(),
            schema: schema.toJSON(),
        };
        const metadataBytes = serializer.encode(metadata);
        return {
            id: containerId,
            blobs: {
                metadata: encodeBase64(metadataBytes),
            },
            trees,
        };
    }
}
/**
 * 将 Uint8Array 编码为 Base64 字符串。
 */
function encodeBase64(data) {
    return Buffer.from(data).toString("base64");
}
//# sourceMappingURL=SnapshotBuilder.js.map