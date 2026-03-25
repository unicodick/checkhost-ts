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
  address: string | null,
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

export type CheckResult = PingResult | HttpResult | TcpResult | DnsResult;

export interface ExtendedResult<T> {
  command: string;
  created: number;
  host: string;
  results: T;
}

export interface NodeEntry {
  asn: string;
  ip: string;
  location: [countryCode: string, countryName: string, city: string];
}

export class CheckHostError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "CheckHostError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
