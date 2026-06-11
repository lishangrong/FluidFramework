import { UrlResolveError } from "../errors/UrlResolveError.js";
import { LoaderErrorCode } from "../errors/LoaderErrorCode.js";
import type { ITokens } from "../interfaces/IResolvedUrl.js";

/**
 * 解析后的 Fluid URL 结构。
 */
export interface IParsedFluidUrl {
	readonly protocol: string;
	readonly host: string;
	readonly containerId: string;
	readonly path: string;
	readonly query: Record<string, string>;
	readonly tokens: ITokens;
}

const SUPPORTED_PROTOCOLS = new Set(["fluid:", "https:", "orderer:"]);

/**
 * 纯函数工具类：解析各种格式的 Fluid URL。
 *
 * 支持格式：
 *   fluid://host/containerId?token=xxx
 *   https://host/fluid/containerId
 *   orderer://host/containerId
 */
export class FluidUrlParser {
	static parse(url: string): IParsedFluidUrl {
		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			throw new UrlResolveError(
				`Invalid URL format: ${url}`,
				LoaderErrorCode.InvalidUrl,
				{ url },
			);
		}

		const protocol = parsed.protocol;
		if (!SUPPORTED_PROTOCOLS.has(protocol)) {
			throw new UrlResolveError(
				`Unsupported protocol: ${protocol}. Supported: ${[...SUPPORTED_PROTOCOLS].join(", ")}`,
				LoaderErrorCode.InvalidUrl,
				{ url, protocol },
			);
		}

		const containerId = FluidUrlParser.extractContainerId(parsed);
		if (!containerId) {
			throw new UrlResolveError(
				`Missing container ID in URL: ${url}`,
				LoaderErrorCode.MissingContainerId,
				{ url },
			);
		}

		const query: Record<string, string> = {};
		parsed.searchParams.forEach((value, key) => {
			query[key] = value;
		});

		return {
			protocol,
			host: parsed.host,
			containerId,
			path: parsed.pathname,
			query,
			tokens: FluidUrlParser.extractTokens(parsed),
		};
	}

	static isFluidUrl(url: string): boolean {
		try {
			const parsed = new URL(url);
			return SUPPORTED_PROTOCOLS.has(parsed.protocol);
		} catch {
			return false;
		}
	}

	private static extractContainerId(parsed: URL): string {
		const segments = parsed.pathname
			.split("/")
			.filter((s) => s.length > 0);

		if (parsed.protocol === "https:") {
			// https://host/fluid/containerId — skip "fluid" prefix
			return segments.length >= 2 ? segments[segments.length - 1] : "";
		}

		// fluid://host/containerId, orderer://host/containerId
		return segments.length >= 1 ? segments[segments.length - 1] : "";
	}

	private static extractTokens(parsed: URL): ITokens {
		return {
			jwt: parsed.searchParams.get("token") ?? undefined,
			storageToken:
				parsed.searchParams.get("storageToken") ?? undefined,
		};
	}
}
