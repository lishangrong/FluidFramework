/**
 * 描述需要加载的代码包的元信息。
 */
export interface IFluidCodeDetails {
	readonly package: string;
	readonly version: string;
	readonly entryPoint?: string;
	readonly config?: Record<string, unknown>;
}
