import { apiFetch } from "./client.js";
import type { RequestOptions } from "./client.js";
import type { CheckResponse } from "./types.js";
import { CheckHostError } from "./types.js";
import { assertCheckResponse, assertHost } from "./validators.js";

export type CheckOptions = RequestOptions & {
  maxNodes?: number;
  nodes?: string[];
};

function buildCheckParams(
  host: string,
  options?: CheckOptions,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = { host: assertHost(host) };

  if (options?.maxNodes !== undefined) {
    if (
      typeof options.maxNodes !== "number" ||
      !Number.isInteger(options.maxNodes) ||
      options.maxNodes <= 0
    ) {
      throw new CheckHostError("maxNodes must be a positive integer", 0, { kind: "validation" });
    }
    params.max_nodes = String(options.maxNodes);
  }

  if (options?.nodes !== undefined) {
    if (!Array.isArray(options.nodes)) {
      throw new CheckHostError("nodes must be an array of strings", 0, { kind: "validation" });
    }

    const normalizedNodes = options.nodes.map((node) => {
      if (typeof node !== "string") {
        throw new CheckHostError("nodes must contain only strings", 0, { kind: "validation" });
      }
      return node.trim();
    });
    if (normalizedNodes.some((node) => node.length === 0)) {
      throw new CheckHostError("nodes must not contain empty strings", 0, { kind: "validation" });
    }
    if (normalizedNodes.length > 0) {
      params.node = normalizedNodes;
    }
  }

  return params;
}

export async function checkPing(host: string, options?: CheckOptions): Promise<CheckResponse> {
  return assertCheckResponse(
    await apiFetch("/check-ping", buildCheckParams(host, options), options),
  );
}

export async function checkHttp(host: string, options?: CheckOptions): Promise<CheckResponse> {
  return assertCheckResponse(
    await apiFetch("/check-http", buildCheckParams(host, options), options),
  );
}

export async function checkTcp(host: string, options?: CheckOptions): Promise<CheckResponse> {
  return assertCheckResponse(
    await apiFetch("/check-tcp", buildCheckParams(host, options), options),
  );
}

export async function checkDns(host: string, options?: CheckOptions): Promise<CheckResponse> {
  return assertCheckResponse(
    await apiFetch("/check-dns", buildCheckParams(host, options), options),
  );
}

export async function checkUdp(host: string, options?: CheckOptions): Promise<CheckResponse> {
  return assertCheckResponse(
    await apiFetch("/check-udp", buildCheckParams(host, options), options),
  );
}
