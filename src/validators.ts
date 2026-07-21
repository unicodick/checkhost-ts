import { CheckHostError } from "./types";
import type {
  CheckResponse,
  CheckResult,
  DnsCheckRow,
  ExtendedResult,
  HttpCheckRow,
  NodeEntry,
  PingReply,
  TcpCheckRow,
  UdpCheckRow,
} from "./types";

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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPingReply(value: unknown): value is PingReply {
  return (
    Array.isArray(value) &&
    (value.length === 2 || value.length === 3) &&
    typeof value[0] === "string" &&
    isFiniteNumber(value[1]) &&
    (value.length === 2 || typeof value[2] === "string")
  );
}

function isHttpCheckRow(value: unknown): value is HttpCheckRow {
  return (
    Array.isArray(value) &&
    (value.length === 4 || value.length === 5) &&
    isFiniteNumber(value[0]) &&
    isFiniteNumber(value[1]) &&
    typeof value[2] === "string" &&
    (typeof value[3] === "string" || value[3] === null) &&
    (value.length === 4 || typeof value[4] === "string" || value[4] === null)
  );
}

function isTcpCheckRow(value: unknown): value is TcpCheckRow {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (isFiniteNumber(value.time) && typeof value.address === "string") ||
    typeof value.error === "string"
  );
}

function isDnsCheckRow(value: unknown): value is DnsCheckRow {
  if (
    !isRecord(value) ||
    !("TTL" in value) ||
    (!isFiniteNumber(value.TTL) && value.TTL !== null)
  ) {
    return false;
  }

  return Object.values(value).every(
    (item) =>
      item === null ||
      isFiniteNumber(item) ||
      (Array.isArray(item) && item.every((entry) => typeof entry === "string")),
  );
}

function isUdpCheckRow(value: unknown): value is UdpCheckRow {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.error === "string") {
    return value.address === undefined || typeof value.address === "string";
  }

  return typeof value.address === "string" && isFiniteNumber(value.timeout);
}

function isPingNodeResult(value: unknown[]): boolean {
  return value.every(
    (batch) =>
      batch === null ||
      (Array.isArray(batch) && batch.every((reply) => reply === null || isPingReply(reply))),
  );
}

function isCheckNodeResult(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  return (
    value.length === 0 ||
    isPingNodeResult(value) ||
    value.every(isHttpCheckRow) ||
    value.every(isTcpCheckRow) ||
    value.every(isDnsCheckRow) ||
    value.every(isUdpCheckRow)
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
    if (nodeResult !== null && !isCheckNodeResult(nodeResult)) {
      throw new CheckHostError("Invalid check result: node result shape is invalid", 0);
    }
  }

  return data as CheckResult;
}

export function assertExtendedResult(data: unknown): ExtendedResult<CheckResult> {
  if (!isRecord(data)) {
    throw new CheckHostError("Invalid extended result: expected an object", 0);
  }

  const { command, created, host, port, results } = data;
  if (
    typeof command !== "string" ||
    !isFiniteNumber(created) ||
    typeof host !== "string" ||
    (port !== undefined && typeof port !== "string")
  ) {
    throw new CheckHostError("Invalid extended result: missing required fields", 0);
  }

  return {
    command,
    created,
    host,
    ...(port === undefined ? {} : { port }),
    results: assertCheckResult(results),
  };
}

export function assertNodeIPsResponse(data: unknown): string[] {
  if (
    !isRecord(data) ||
    !Array.isArray(data.nodes) ||
    !data.nodes.every((node) => typeof node === "string")
  ) {
    throw new CheckHostError("Invalid node IPs response: expected { nodes: string[] }", 0);
  }

  return data.nodes;
}

export function assertNodeHostsResponse(data: unknown): Record<string, NodeEntry> {
  if (!isRecord(data) || !isRecord(data.nodes)) {
    throw new CheckHostError("Invalid node hosts response: expected { nodes: {...} }", 0);
  }

  for (const nodeEntry of Object.values(data.nodes)) {
    if (!isNodeEntry(nodeEntry)) {
      throw new CheckHostError("Invalid node hosts response: node entry shape is invalid", 0);
    }
  }

  return data.nodes as Record<string, NodeEntry>;
}
