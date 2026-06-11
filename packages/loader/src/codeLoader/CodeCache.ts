import type { IFluidModule } from "../interfaces/IFluidModule.js";

interface ICachedModule {
	readonly module: IFluidModule;
	readonly loadedAt: number;
	lastAccessedAt: number;
}

/**
 * LRU 代码缓存。使用 package@version 作为缓存键。
 * 使用单调递增计数器确保访问顺序的精确性。
 */
export class CodeCache {
	private readonly cache = new Map<string, ICachedModule>();
	private readonly maxSize: number;
	private accessCounter = 0;

	constructor(maxSize: number = 50) {
		this.maxSize = maxSize;
	}

	get(key: string): IFluidModule | undefined {
		const entry = this.cache.get(key);
		if (entry) {
			entry.lastAccessedAt = ++this.accessCounter;
			return entry.module;
		}
		return undefined;
	}

	set(key: string, module: IFluidModule): void {
		if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
			this.evictLru();
		}
		const now = ++this.accessCounter;
		this.cache.set(key, {
			module,
			loadedAt: now,
			lastAccessedAt: now,
		});
	}

	has(key: string): boolean {
		return this.cache.has(key);
	}

	delete(key: string): boolean {
		return this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}

	get size(): number {
		return this.cache.size;
	}

	static buildKey(packageName: string, version: string): string {
		return `${packageName}@${version}`;
	}

	private evictLru(): void {
		let oldestKey: string | undefined;
		let oldestTime = Infinity;

		for (const [key, entry] of this.cache) {
			if (entry.lastAccessedAt < oldestTime) {
				oldestTime = entry.lastAccessedAt;
				oldestKey = key;
			}
		}

		if (oldestKey !== undefined) {
			this.cache.delete(oldestKey);
		}
	}
}
