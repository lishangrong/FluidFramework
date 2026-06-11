import type { IResolvedUrl } from "./IResolvedUrl.js";
import type { IFluidCodeDetails } from "./IFluidCodeDetails.js";

/**
 * Loader 可能发出的事件。
 */
export interface ILoaderEvents {
	urlResolved: (resolvedUrl: IResolvedUrl) => void;
	codeLoaded: (details: IFluidCodeDetails) => void;
	containerLoaded: (containerId: string) => void;
	error: (error: Error) => void;
	retrying: (info: {
		attempt: number;
		delayMs: number;
		error: Error;
	}) => void;
}
