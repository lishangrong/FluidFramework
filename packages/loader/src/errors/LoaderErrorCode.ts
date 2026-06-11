/**
 * Loader 模块中所有错误的错误码枚举。
 * 按模块分段编号以便快速定位错误来源。
 */
export enum LoaderErrorCode {
	// Protocol errors (1xxx)
	ProtocolNotRegistered = 1001,
	ProtocolAlreadyRegistered = 1002,
	ProtocolMismatch = 1003,

	// Code loading errors (2xxx)
	CodeLoadFailed = 2001,
	InvalidModule = 2002,
	ModuleNotFound = 2003,
	ModuleValidationFailed = 2004,

	// URL resolve errors (3xxx)
	InvalidUrl = 3001,
	UrlResolveFailed = 3002,
	MissingContainerId = 3003,

	// Retry errors (4xxx)
	RetryExhausted = 4001,

	// Scope errors (5xxx)
	ScopeAlreadyExists = 5001,
	ScopeDisposed = 5002,
}
