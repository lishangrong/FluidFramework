/**
 * URL 解析后的标准化结构。
 */
export interface IResolvedUrl {
	readonly type: string;
	readonly endpoints: IEndpoints;
	readonly id: string;
	readonly tokens: ITokens;
	readonly url: string;
}

/**
 * 文档服务的各端点 URL。
 */
export interface IEndpoints {
	readonly deltaStorageUrl: string;
	readonly ordererUrl: string;
	readonly storageUrl: string;
}

/**
 * 访问凭证。
 */
export interface ITokens {
	readonly jwt?: string;
	readonly storageToken?: string;
}
