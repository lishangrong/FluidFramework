import type { IResolvedUrl } from "./IResolvedUrl.js";

/**
 * 加载请求。
 */
export interface IRequest {
	readonly url: string;
	readonly headers?: Record<string, string>;
}

/**
 * 将原始 Fluid 容器 URL 解析为结构化的 IResolvedUrl。
 */
export interface IUrlResolver {
	resolve(request: IRequest): Promise<IResolvedUrl | undefined>;
	getAbsoluteUrl(
		resolvedUrl: IResolvedUrl,
		relativeUrl: string,
	): Promise<string>;
}
