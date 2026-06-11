import { EventEmitter } from "node:events";
import type { ILoader, ILoaderConfig, ILoaderResult } from "../interfaces/ILoader.js";
import type { IRequest } from "../interfaces/IUrlResolver.js";
import type { IResolvedUrl } from "../interfaces/IResolvedUrl.js";
import type { ILoaderEvents } from "../interfaces/ILoaderEvents.js";
import type { IFluidModule } from "../interfaces/IFluidModule.js";
import type { IScope } from "../interfaces/IScope.js";
import type { IUrlResolver } from "../interfaces/IUrlResolver.js";
import type { IDocumentServiceFactory } from "../interfaces/IDocumentServiceFactory.js";
import type { ICodeLoader } from "../interfaces/ICodeLoader.js";
import type { IScopeManager } from "../interfaces/IScopeManager.js";
import type { IRetryPolicy } from "../interfaces/IRetryPolicy.js";
import { UrlResolveError } from "../errors/UrlResolveError.js";
import { LoaderErrorCode } from "../errors/LoaderErrorCode.js";
import { ScopeManager } from "../scope/ScopeManager.js";
import { RetryPolicy } from "../retry/RetryPolicy.js";
import { Logger, LogLevel } from "../utils/logger.js";

/**
 * Fluid Loader 主类。协调所有子系统完成容器加载。
 *
 * 加载流程:
 *   1. UrlResolver.resolve(url) → IResolvedUrl
 *   2. DocumentServiceFactory.createDocumentService(resolvedUrl) → IDocumentService
 *   3. CodeLoader.load(codeDetails) → IFluidModule
 *   4. ScopeManager.createScope(containerId) → IScope
 *   5. 返回 ILoaderResult
 *
 * 每一步都通过 RetryPolicy 包裹以处理暂时性失败。
 */
export class Loader extends EventEmitter implements ILoader {
	private readonly urlResolver: IUrlResolver;
	private readonly documentServiceFactory: IDocumentServiceFactory;
	private readonly codeLoader: ICodeLoader;
	private readonly scopeManager: IScopeManager;
	private readonly retryPolicy: IRetryPolicy;
	private readonly logger: Logger;

	constructor(config: ILoaderConfig) {
		super();
		this.urlResolver = config.urlResolver;
		this.documentServiceFactory = config.documentServiceFactory;
		this.codeLoader = config.codeLoader;
		this.scopeManager = config.scopeManager ?? new ScopeManager();
		this.retryPolicy = config.retryPolicy ?? new RetryPolicy();
		this.logger = new Logger("Loader", LogLevel.Info);
	}

	/**
	 * 解析 URL 并加载已有容器。
	 */
	async resolve(request: IRequest): Promise<ILoaderResult> {
		this.logger.info(`Resolving container: ${request.url}`);

		// Step 1: 解析 URL
		const resolvedUrl = await this.resolveUrl(request);
		this.safeEmit("urlResolved", resolvedUrl);

		// Step 2: 创建文档服务
		const documentService = await this.retryPolicy.execute(
			() => this.documentServiceFactory.createDocumentService(resolvedUrl),
			"createDocumentService",
		);

		// Step 3: 加载代码模块
		const module = await this.loadCode(resolvedUrl);

		// Step 4: 创建作用域
		this.createScopeForContainer(resolvedUrl.id);

		this.safeEmit("containerLoaded", resolvedUrl.id);
		this.logger.info(`Container loaded: ${resolvedUrl.id}`);

		return {
			containerId: resolvedUrl.id,
			resolvedUrl,
			documentService,
			module,
		};
	}

	/**
	 * 创建新的容器。
	 */
	async createContainer(request: IRequest): Promise<ILoaderResult> {
		this.logger.info(`Creating container: ${request.url}`);

		// Step 1: 解析 URL
		const resolvedUrl = await this.resolveUrl(request);
		this.safeEmit("urlResolved", resolvedUrl);

		// Step 2: 通过工厂创建容器
		const newResolvedUrl = await this.retryPolicy.execute(
			() =>
				this.documentServiceFactory.createContainer({
					resolvedUrl,
				}),
			"createContainer",
		);

		// Step 3: 使用新 URL 创建文档服务
		const documentService = await this.retryPolicy.execute(
			() =>
				this.documentServiceFactory.createDocumentService(
					newResolvedUrl,
				),
			"createDocumentService",
		);

		// Step 4: 加载代码模块
		const module = await this.loadCode(newResolvedUrl);

		// Step 5: 创建作用域
		this.createScopeForContainer(newResolvedUrl.id);

		this.safeEmit("containerLoaded", newResolvedUrl.id);
		this.logger.info(`Container created: ${newResolvedUrl.id}`);

		return {
			containerId: newResolvedUrl.id,
			resolvedUrl: newResolvedUrl,
			documentService,
			module,
		};
	}

	// 类型安全的事件方法
	override on<K extends keyof ILoaderEvents>(
		event: K,
		listener: ILoaderEvents[K],
	): this {
		return super.on(event, listener as (...args: unknown[]) => void);
	}

	override off<K extends keyof ILoaderEvents>(
		event: K,
		listener: ILoaderEvents[K],
	): this {
		return super.off(event, listener as (...args: unknown[]) => void);
	}

	private async resolveUrl(request: IRequest): Promise<IResolvedUrl> {
		return this.retryPolicy.execute(async () => {
			const resolved = await this.urlResolver.resolve(request);
			if (!resolved) {
				throw new UrlResolveError(
					`Unable to resolve URL: ${request.url}`,
					LoaderErrorCode.UrlResolveFailed,
					{ url: request.url },
				);
			}
			return resolved;
		}, "resolveUrl");
	}

	private async loadCode(resolvedUrl: IResolvedUrl): Promise<IFluidModule> {
		const codeDetails = {
			package: resolvedUrl.type,
			version: "latest",
		};

		const module = await this.retryPolicy.execute(
			() => this.codeLoader.load(codeDetails),
			"loadCode",
		);

		this.safeEmit("codeLoaded", codeDetails);
		return module;
	}

	private createScopeForContainer(containerId: string): IScope {
		return this.scopeManager.createScope(containerId);
	}

	private safeEmit<K extends keyof ILoaderEvents>(
		event: K,
		...args: Parameters<ILoaderEvents[K]>
	): void {
		try {
			this.emit(event, ...args);
		} catch (error) {
			this.logger.error(`Error in event listener for "${event}"`, error);
		}
	}
}
