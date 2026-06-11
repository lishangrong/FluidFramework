import type {
	IUrlResolver,
	IRequest,
} from "../interfaces/IUrlResolver.js";
import type {
	IResolvedUrl,
	IEndpoints,
} from "../interfaces/IResolvedUrl.js";
import { FluidUrlParser } from "./FluidUrlParser.js";
import type { IParsedFluidUrl } from "./FluidUrlParser.js";

export interface IUrlResolverOptions {
	readonly endpointOverrides?: Partial<IEndpoints>;
}

/**
 * URL 解析器实现。
 * 使用 FluidUrlParser 解析 URL，并构造 IResolvedUrl。
 */
export class UrlResolver implements IUrlResolver {
	private readonly endpointOverrides?: Partial<IEndpoints>;

	constructor(options?: IUrlResolverOptions) {
		this.endpointOverrides = options?.endpointOverrides;
	}

	async resolve(request: IRequest): Promise<IResolvedUrl | undefined> {
		if (!FluidUrlParser.isFluidUrl(request.url)) {
			return undefined;
		}

		const parsed = FluidUrlParser.parse(request.url);
		const endpoints = this.buildEndpoints(parsed);

		return {
			type: parsed.protocol.replace(":", ""),
			endpoints,
			id: parsed.containerId,
			tokens: parsed.tokens,
			url: request.url,
		};
	}

	async getAbsoluteUrl(
		resolvedUrl: IResolvedUrl,
		relativeUrl: string,
	): Promise<string> {
		const base = `${resolvedUrl.type}://${resolvedUrl.endpoints.storageUrl}`;
		if (relativeUrl) {
			return `${base}/${relativeUrl}`;
		}
		return `${base}/${resolvedUrl.id}`;
	}

	private buildEndpoints(parsed: IParsedFluidUrl): IEndpoints {
		const baseUrl = `${parsed.protocol}//${parsed.host}`;
		return {
			deltaStorageUrl:
				this.endpointOverrides?.deltaStorageUrl ??
				`${baseUrl}/deltas/${parsed.containerId}`,
			ordererUrl:
				this.endpointOverrides?.ordererUrl ??
				`${baseUrl}/orderer`,
			storageUrl:
				this.endpointOverrides?.storageUrl ??
				`${baseUrl}/storage/${parsed.containerId}`,
		};
	}
}
