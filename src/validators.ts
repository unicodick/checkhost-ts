import { CheckHostError } from "./types";
import type { CheckResponse, CheckResult, ExtendedResult, NodeEntry } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeInfo(value: unknown): value is [string, string, string, string, string] {
  return (
    Array.isArray(value) &&
    value.length === 5 &&
    value.every((item) => typeof item === "string")
  );
}

function isNodeEntry(value: unknown): value is NodeEntry {
  if (!isRecord(value)) {
    return false;
  }

  const location = value.location;
  return (
    typeof value.asn === "string" &&
    typeof value.ip === "string" &&
    Array.isArray(location) &&
    location.length === 3 &&
    location.every((item) => typeof item === "string")
  );
}

export function assertHost(host: string): string {
  const trimmedHost = host.trim();
  if (trimmedHost.length === 0) {
    throw new CheckHostError("host must be a non-empty string", 0);
  }
  return trimmedHost;
}

export function assertRequestId(requestId: string): string {
  const trimmedRequestId = requestId.trim();
  if (trimmedRequestId.length === 0) {
    throw new CheckHostError("requestId must be a non-empty string", 0);
  }
  return trimmedRequestId;
}

export function assertCheckResponse(data: unknown): CheckResponse {
  if (!isRecord(data)) {
    throw new CheckHostError("Invalid check response: expected an object", 0);
  }

  const { ok, request_id, permanent_link, nodes } = data;
  if (typeof ok !== "number" || typeof request_id !== "string" || typeof permanent_link !== "string") {
    throw new CheckHostError("Invalid check response: missing required fields", 0);
  }

  if (!isRecord(nodes)) {
    throw new CheckHostError("Invalid check response: nodes must be an object", 0);
  }

  for (const nodeInfo of Object.values(nodes)) {
    if (!isNodeInfo(nodeInfo)) {
      throw new CheckHostError("Invalid check response: node metadata shape is invalid", 0);
    }
  }

  return {
    ok,
    request_id,
    permanent_link,
    nodes: nodes as CheckResponse["nodes"],
  };
}

export function assertCheckResult(data: unknown): CheckResult {
  if (!isRecord(data)) {
    throw new CheckHostError("Invalid check result: expected an object", 0);
  }

  for (const nodeResult of Object.values(data)) {
    if (nodeResult !== null && !Array.isArray(nodeResult)) {
      throw new CheckHostError("Invalid check result: node result must be an array or null", 0);
    }
  }

  return data as CheckResult;
}

export function assertExtendedResult(data: unknown): ExtendedResult<CheckResult> {
  if (!isRecord(data)) {
    throw new CheckHostError("Invalid extended result: expected an object", 0);
  }

  const { command, created, host, results } = data;
  if (typeof command !== "string" || typeof created !== "number" || typeof host !== "string") {
    throw new CheckHostError("Invalid extended result: missing required fields", 0);
  }

  return {
    command,
    created,
    host,
    results: assertCheckResult(results),
  };
}

export function assertNodesResponse(data: unknown): Record<string, NodeEntry> {
  if (!isRecord(data) || !isRecord(data.nodes)) {
    throw new CheckHostError("Invalid nodes response: expected { nodes: {...} }", 0);
  }

  for (const nodeEntry of Object.values(data.nodes)) {
    if (!isNodeEntry(nodeEntry)) {
      throw new CheckHostError("Invalid nodes response: node entry shape is invalid", 0);
    }
  }

  return data.nodes as Record<string, NodeEntry>;
}
