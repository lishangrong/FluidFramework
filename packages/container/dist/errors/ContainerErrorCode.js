/**
 * Container 模块中所有错误的错误码枚举。
 * 按模块分段编号以便快速定位错误来源。
 */
export var ContainerErrorCode;
(function (ContainerErrorCode) {
    // Schema 错误 (6xxx)
    ContainerErrorCode[ContainerErrorCode["InvalidSchema"] = 6001] = "InvalidSchema";
    ContainerErrorCode[ContainerErrorCode["UnknownDdsType"] = 6002] = "UnknownDdsType";
    ContainerErrorCode[ContainerErrorCode["DuplicateInitialObject"] = 6003] = "DuplicateInitialObject";
    ContainerErrorCode[ContainerErrorCode["DynamicTypeNotRegistered"] = 6004] = "DynamicTypeNotRegistered";
    // DDS 错误 (7xxx)
    ContainerErrorCode[ContainerErrorCode["DdsNotFound"] = 7001] = "DdsNotFound";
    ContainerErrorCode[ContainerErrorCode["DdsAlreadyExists"] = 7002] = "DdsAlreadyExists";
    ContainerErrorCode[ContainerErrorCode["DdsOperationFailed"] = 7003] = "DdsOperationFailed";
    ContainerErrorCode[ContainerErrorCode["DdsDisposed"] = 7004] = "DdsDisposed";
    ContainerErrorCode[ContainerErrorCode["InvalidOperation"] = 7005] = "InvalidOperation";
    // 快照错误 (8xxx)
    ContainerErrorCode[ContainerErrorCode["SnapshotFailed"] = 8001] = "SnapshotFailed";
    ContainerErrorCode[ContainerErrorCode["SnapshotRestoreFailed"] = 8002] = "SnapshotRestoreFailed";
    ContainerErrorCode[ContainerErrorCode["SnapshotCorrupted"] = 8003] = "SnapshotCorrupted";
    // 序列化错误 (9xxx)
    ContainerErrorCode[ContainerErrorCode["EncodeFailed"] = 9001] = "EncodeFailed";
    ContainerErrorCode[ContainerErrorCode["DecodeFailed"] = 9002] = "DecodeFailed";
    ContainerErrorCode[ContainerErrorCode["UnsupportedType"] = 9003] = "UnsupportedType";
    ContainerErrorCode[ContainerErrorCode["BufferOverflow"] = 9004] = "BufferOverflow";
    ContainerErrorCode[ContainerErrorCode["InvalidBinaryFormat"] = 9005] = "InvalidBinaryFormat";
    // 容器生命周期错误 (10xxx)
    ContainerErrorCode[ContainerErrorCode["ContainerDisposed"] = 10001] = "ContainerDisposed";
    ContainerErrorCode[ContainerErrorCode["ContainerNotConnected"] = 10002] = "ContainerNotConnected";
    ContainerErrorCode[ContainerErrorCode["ConnectionFailed"] = 10003] = "ConnectionFailed";
})(ContainerErrorCode || (ContainerErrorCode = {}));
//# sourceMappingURL=ContainerErrorCode.js.map