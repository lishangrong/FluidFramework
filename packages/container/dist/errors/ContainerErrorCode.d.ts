/**
 * Container 模块中所有错误的错误码枚举。
 * 按模块分段编号以便快速定位错误来源。
 */
export declare enum ContainerErrorCode {
    InvalidSchema = 6001,
    UnknownDdsType = 6002,
    DuplicateInitialObject = 6003,
    DynamicTypeNotRegistered = 6004,
    DdsNotFound = 7001,
    DdsAlreadyExists = 7002,
    DdsOperationFailed = 7003,
    DdsDisposed = 7004,
    InvalidOperation = 7005,
    SnapshotFailed = 8001,
    SnapshotRestoreFailed = 8002,
    SnapshotCorrupted = 8003,
    EncodeFailed = 9001,
    DecodeFailed = 9002,
    UnsupportedType = 9003,
    BufferOverflow = 9004,
    InvalidBinaryFormat = 9005,
    ContainerDisposed = 10001,
    ContainerNotConnected = 10002,
    ConnectionFailed = 10003
}
//# sourceMappingURL=ContainerErrorCode.d.ts.map