import type { IDocumentService } from "./IDocumentService.js";
import type { IResolvedUrl } from "./IResolvedUrl.js";

/**
 * 文档服务工厂，根据协议创建对应的 IDocumentService 实例。
 */
export interface IDocumentServiceFactory {
	readonly protocolName: string;
	createDocumentService(
		resolvedUrl: IResolvedUrl,
	): Promise<IDocumentService>;
	createContainer(
		createParams: ICreateContainerParams,
	): Promise<IResolvedUrl>;
}

export interface ICreateContainerParams {
	readonly resolvedUrl: IResolvedUrl;
	readonly summary?: unknown;
}
