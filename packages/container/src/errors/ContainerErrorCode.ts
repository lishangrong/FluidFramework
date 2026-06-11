/**
 * Container 模块中所有错误的错误码枚举。
 * 按模块分段编号以便快速定位错误来源。
 */
export enum ContainerErrorCode {
	// Schema 错误 (6xxx)
	InvalidSchema = 6001,
	UnknownDdsType = 6002,
	DuplicateInitialObject = 6003,
	DynamicTypeNotRegistered = 6004,

	// DDS 错误 (7xxx)
	DdsNotFound = 7001,
	DdsAlreadyExists = 7002,
	DdsOperationFailed = 7003,
	DdsDisposed = 7004,
	InvalidOperation = 7005,

	// 快照错误 (8xxx)
	SnapshotFailed = 8001,
	SnapshotRestoreFailed = 8002,
	SnapshotCorrupted = 8003,

	// 序列化错误 (9xxx)
	EncodeFailed = 9001,
	DecodeFailed = 9002,
	UnsupportedType = 9003,
	BufferOverflow = 9004,
	InvalidBinaryFormat = 9005,

	// 容器生命周期错误 (10xxx)
	ContainerDisposed = 10001,
	ContainerNotConnected = 10002,
	ConnectionFailed = 10003,
}
