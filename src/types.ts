export type NodeInfo = [
  countryCode: string,
  countryName: string,
  city: string,
  ip: string,
  asn: string,
];

export interface CheckResponse {
  ok: number;
  request_id: string;
  permanent_link: string;
  nodes: Record<string, NodeInfo>;
}

export type PingReply = [status: string, time: number, address?: string];

export type PingResult = Record<string, Array<Array<PingReply | null> | null> | null>;

export type HttpCheckRow = [
  success: number,
  time: number,
  statusText: string,
  statusCode: string | null,
  address?: string | null,
];

export type HttpResult = Record<string, Array<HttpCheckRow> | null>;

export type TcpCheckRow =
  | {
      time: number;
      address: string;
    }
  | {
      error: string;
    };

export type TcpResult = Record<string, Array<TcpCheckRow> | null>;

export interface DnsCheckRow {
  TTL: number | null;
  [recordType: string]: string[] | number | null;
}

export type DnsResult = Record<string, Array<DnsCheckRow> | null>;

export type UdpCheckRow =
  | {
      address: string;
      timeout: number;
    }
  | {
      address?: string;
      error: string;
    };

export type UdpResult = Record<string, Array<UdpCheckRow> | null>;

export interface CheckResultMap {
  ping: PingResult;
  http: HttpResult;
  tcp: TcpResult;
  dns: DnsResult;
  udp: UdpResult;
}

export type CheckType = keyof CheckResultMap;

export type CheckResultFor<T extends CheckType> = CheckResultMap[T];

export type CheckResult = CheckResultFor<CheckType>;

export interface ExtendedResult<T = CheckResult, C extends string = string> {
  command: C;
  created: number;
  host: string;
  port?: string;
  results: T;
}

export type ExtendedCheckResult = {
  [T in CheckType]: ExtendedResult<CheckResultFor<T>, T>;
}[CheckType];

export interface NodeEntry {
  asn: string;
  ip: string;
  location: [countryCode: string, countryName: string, city: string];
}

export type CheckHostErrorKind =
  | "unknown"
  | "validation"
  | "network"
  | "timeout"
  | "aborted"
  | "http"
  | "response";

export interface CheckHostErrorDetails {
  kind?: CheckHostErrorKind;
  cause?: unknown;
  responseBody?: unknown;
  url?: string;
}

export class CheckHostError extends Error {
  statusCode: number;
  kind: CheckHostErrorKind;
  responseBody?: unknown;
  url?: string;

  constructor(message: string, statusCode: number, details: CheckHostErrorDetails = {}) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
    this.name = "CheckHostError";
    this.statusCode = statusCode;
    this.kind = details.kind ?? "unknown";
    this.responseBody = details.responseBody;
    this.url = details.url;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
