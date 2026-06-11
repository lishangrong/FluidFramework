import type { IDocumentServiceFactory } from "./IDocumentServiceFactory.js";
import type { ICodeLoader } from "./ICodeLoader.js";
import type { IUrlResolver, IRequest } from "./IUrlResolver.js";
import type { IScopeManager } from "./IScopeManager.js";
import type { IRetryPolicy } from "./IRetryPolicy.js";
import type { IResolvedUrl } from "./IResolvedUrl.js";
import type { ILoaderEvents } from "./ILoaderEvents.js";

/**
 * Loader 配置。
 */
export interface ILoaderConfig {
	readonly documentServiceFactory: IDocumentServiceFactory;
	readonly codeLoader: ICodeLoader;
	readonly urlResolver: IUrlResolver;
	readonly scopeManager?: IScopeManager;
	readonly retryPolicy?: IRetryPolicy;
}

/**
 * Fluid 容器加载器主接口。
 */
export interface ILoader {
	resolve(request: IRequest): Promise<ILoaderResult>;
	createContainer(request: IRequest): Promise<ILoaderResult>;
	on<K extends keyof ILoaderEvents>(
		event: K,
		listener: ILoaderEvents[K],
	): this;
	off<K extends keyof ILoaderEvents>(
		event: K,
		listener: ILoaderEvents[K],
	): this;
}

export interface ILoaderResult {
	readonly containerId: string;
	readonly resolvedUrl: IResolvedUrl;
	readonly documentService: unknown;
	readonly module: unknown;
}
