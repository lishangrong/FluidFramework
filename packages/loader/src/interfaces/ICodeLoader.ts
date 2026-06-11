import type { IFluidCodeDetails } from "./IFluidCodeDetails.js";
import type { IFluidModule } from "./IFluidModule.js";

/**
 * 异步代码加载器，负责根据代码详情拉取并缓存代码模块。
 */
export interface ICodeLoader {
	load(source: IFluidCodeDetails): Promise<IFluidModule>;
	preload(source: IFluidCodeDetails): Promise<void>;
	evict(packageId: string): boolean;
}
