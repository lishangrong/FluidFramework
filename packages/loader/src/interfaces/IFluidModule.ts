/**
 * 加载后的 Fluid 代码模块。
 */
export interface IFluidModule {
	readonly fluidExport: IFluidExport;
}

export interface IFluidExport {
	readonly IRuntimeFactory: IRuntimeFactory;
}

export interface IRuntimeFactory {
	readonly type: string;
	instantiateRuntime(context: unknown): Promise<unknown>;
}
