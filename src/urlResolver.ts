/**
 * Fluid Loader - URL Resolver
 *
 * Parses Fluid container locator URLs and extracts container ID,
 * service endpoint, and access credentials.
 *
 * Supported URL formats:
 *   fluid://<host>[:<port>]/<containerId>[?<params>]
 *   https://<host>[:<port>]/fluid/<containerId>[?<params>]
 */

import type { IFluidCredentials, IFluidResolvedUrl } from "./types";
import { UrlResolutionError } from "./errors";

/** Protocol-specific path patterns for extracting container ID */
const PROTOCOL_PATTERNS: Record<string, RegExp> = {
  fluid: /^\/(?<containerId>[^/?]+)/,
  https: /^\/fluid\/(?<containerId>[^/?]+)/,
  http: /^\/fluid\/(?<containerId>[^/?]+)/,
};

/**
 * Extract credentials from URL query parameters.
 * Recognized keys: "token", "apiKey", "authorization".
 */
function extractCredentials(searchParams: URLSearchParams): IFluidCredentials {
  const credentials: IFluidCredentials = {};

  const token = searchParams.get("token") ?? searchParams.get("authorization");
  if (token) {
    credentials.token = token;
  }

  const apiKey = searchParams.get("apiKey");
  if (apiKey) {
    credentials.apiKey = apiKey;
  }

  return credentials;
}

/**
 * Convert URLSearchParams to a plain key-value record.
 */
function queryStringToRecord(searchParams: URLSearchParams): Record<string, string> {
  const record: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

/**
 * Resolve a Fluid container URL into its component parts.
 *
 * @param url - The Fluid container URL to resolve
 * @returns Resolved URL with container ID, service endpoint, and credentials
 * @throws UrlResolutionError if the URL is malformed or uses an unsupported format
 */
export function resolveUrl(url: string): IFluidResolvedUrl {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UrlResolutionError(`Invalid URL: "${url}"`, url);
  }

  const protocol = parsed.protocol.replace(":", "");

  // Look up the pattern for this protocol
  const pattern = PROTOCOL_PATTERNS[protocol];
  if (!pattern) {
    throw new UrlResolutionError(
      `Unsupported URL protocol "${protocol}". Supported protocols: ${Object.keys(PROTOCOL_PATTERNS).join(", ")}`,
      url,
    );
  }

  // Match the path to extract container ID
  const pathMatch = parsed.pathname.match(pattern);
  if (!pathMatch?.groups?.containerId) {
    throw new UrlResolutionError(
      `Could not extract container ID from path "${parsed.pathname}". ` +
        `Expected format: ${protocol}://<host>/<containerId> (fluid) or ${protocol}://<host>/fluid/<containerId> (http/https)`,
      url,
    );
  }

  const containerId = pathMatch.groups.containerId;
  const port = parsed.port ? parseInt(parsed.port, 10) : undefined;

  // Build service endpoint (protocol + host + port, without path)
  const serviceEndpoint = `${parsed.protocol}//${parsed.host}`;

  const credentials = extractCredentials(parsed.searchParams);
  const queryString = queryStringToRecord(parsed.searchParams);

  return {
    containerId,
    serviceEndpoint,
    protocol,
    host: parsed.hostname,
    port,
    credentials,
    queryString,
    originalUrl: url,
  };
}

/**
 * Check whether a URL string looks like a valid Fluid container URL.
 * This is a quick syntactic check without full resolution.
 */
export function isFluidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.replace(":", "");
    return protocol in PROTOCOL_PATTERNS;
  } catch {
    return false;
  }
}

/**
 * Build a Fluid URL from components.
 */
export function buildFluidUrl(
  host: string,
  containerId: string,
  options?: { port?: number; protocol?: string; params?: Record<string, string> },
): string {
  const protocol = options?.protocol ?? "fluid";
  const port = options?.port ? `:${options.port}` : "";
  const params = options?.params
    ? "?" + new URLSearchParams(options.params).toString()
    : "";

  if (protocol === "fluid") {
    return `fluid://${host}${port}/${containerId}${params}`;
  }
  return `${protocol}://${host}${port}/fluid/${containerId}${params}`;
}
