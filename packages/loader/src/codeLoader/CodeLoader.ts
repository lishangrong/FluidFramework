import type { ICodeLoader } from "../interfaces/ICodeLoader.js";
import type { IFluidCodeDetails } from "../interfaces/IFluidCodeDetails.js";
import type { IFluidModule } from "../interfaces/IFluidModule.js";
import { CodeLoadError } from "../errors/CodeLoadError.js";
import { LoaderErrorCode } from "../errors/LoaderErrorCode.js";
import { CodeCache } from "./CodeCache.js";

/**
 * 异步代码加载器实现。
 * 支持动态加载、LRU 缓存和并发去重。
 */
export class CodeLoader implements ICodeLoader {
	private readonly cache: CodeCache;
	private readonly pendingLoads = new Map<string, Promise<IFluidModule>>();
	private readonly moduleLoader: (
		entryPoint: string,
	) => Promise<unknown>;

	constructor(options?: {
		cacheSize?: number;
		moduleLoader?: (entryPoint: string) => Promise<unknown>;
	}) {
		this.cache = new CodeCache(options?.cacheSize);
		this.moduleLoader =
			options?.moduleLoader ??
			((entryPoint: string) => import(entryPoint));
	}

	async load(source: IFluidCodeDetails): Promise<IFluidModule> {
		const key = this.buildCacheKey(source);

		// 1. 检查缓存
		const cached = this.cache.get(key);
		if (cached) {
			return cached;
		}

		// 2. 检查是否有正在进行的相同加载请求（并发去重）
		const pending = this.pendingLoads.get(key);
		if (pending) {
			return pending;
		}

		// 3. 发起新的加载
		const loadPromise = this.fetchModule(source)
			.then((module) => {
				this.cache.set(key, module);
				return module;
			})
			.finally(() => {
				this.pendingLoads.delete(key);
			});

		this.pendingLoads.set(key, loadPromise);
		return loadPromise;
	}

	async preload(source: IFluidCodeDetails): Promise<void> {
		await this.load(source);
	}

	evict(packageId: string): boolean {
		return this.cache.delete(packageId);
	}

	private async fetchModule(
		source: IFluidCodeDetails,
	): Promise<IFluidModule> {
		const entryPoint = source.entryPoint ?? source.package;

		let rawModule: unknown;
		try {
			rawModule = await this.moduleLoader(entryPoint);
		} catch (error) {
			throw new CodeLoadError(
				`Failed to load module "${source.package}@${source.version}" from "${entryPoint}"`,
				LoaderErrorCode.CodeLoadFailed,
				{ package: source.package, version: source.version, entryPoint },
				error instanceof Error ? error : new Error(String(error)),
			);
		}

		if (!this.validateModule(rawModule)) {
			throw new CodeLoadError(
				`Module "${source.package}@${source.version}" does not export a valid IFluidModule`,
				LoaderErrorCode.ModuleValidationFailed,
				{ package: source.package, version: source.version },
			);
		}

		return rawModule;
	}

	private buildCacheKey(source: IFluidCodeDetails): string {
		return CodeCache.buildKey(source.package, source.version);
	}

	private validateModule(module: unknown): module is IFluidModule {
		if (module === null || typeof module !== "object") {
			return false;
		}

		const mod = module as Record<string, unknown>;
		if (!mod.fluidExport || typeof mod.fluidExport !== "object") {
			return false;
		}

		const fluidExport = mod.fluidExport as Record<string, unknown>;
		if (
			!fluidExport.IRuntimeFactory ||
			typeof fluidExport.IRuntimeFactory !== "object"
		) {
			return false;
		}

		const factory = fluidExport.IRuntimeFactory as Record<string, unknown>;
		return (
			typeof factory.type === "string" &&
			typeof factory.instantiateRuntime === "function"
		);
	}
}
