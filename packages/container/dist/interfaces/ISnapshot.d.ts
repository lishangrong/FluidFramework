import type { ISnapshotTree } from "./IDocumentService.js";
/**
 * 快照管理器接口。
 */
export interface ISnapshotManager {
    /** 创建当前容器状态的快照。 */
    createSnapshot(containerId: string): Promise<ISnapshotResult>;
    /** 从快照恢复容器状态。 */
    restoreFromSnapshot(snapshot: ISnapshotResult): Promise<void>;
}
/** 快照结果。 */
export interface ISnapshotResult {
    readonly containerId: string;
    readonly sequenceNumber: number;
    readonly timestamp: number;
    readonly tree: ISnapshotTree;
    /** 二进制编码的完整快照数据。 */
    readonly binaryData: Uint8Array;
}
//# sourceMappingURL=ISnapshot.d.ts.map