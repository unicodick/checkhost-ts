# checkhost-ts

Lightweight TypeScript wrapper for the [check-host.net](https://check-host.net) API.

```bash
npm install checkhost-ts
```

---

```ts
import { checkHttp, getResult } from "checkhost-ts";

const check = await checkHttp("check-host.net", { maxNodes: 1 });
const result = await getResult(check.request_id);

console.log(check.request_id);
console.log(result);
```

## API

### `apiFetch(path, params?)`

Low-level helper for direct API calls.

```ts
apiFetch(path: string, params?: Record<string, string | string[]>): Promise<unknown>
```

### Check methods

```ts
checkPing(host: string, options?: CheckOptions): Promise<CheckResponse>
checkHttp(host: string, options?: CheckOptions): Promise<CheckResponse>
checkTcp(host: string, options?: CheckOptions): Promise<CheckResponse>
checkDns(host: string, options?: CheckOptions): Promise<CheckResponse>
checkUdp(host: string, options?: CheckOptions): Promise<CheckResponse>
```

`CheckOptions`:

```ts
type CheckOptions = {
  maxNodes?: number;
  nodes?: string[];
};
```

- `maxNodes`: limits number of checker nodes (`max_nodes` in API).
- `nodes`: explicit node list (sent as repeated `node` query params).

### Result methods

```ts
getResult(requestId: string): Promise<CheckResult>
getResultExtended(requestId: string): Promise<ExtendedResult<CheckResult>>
```

`requestId` is URL-encoded by the library before request execution.

### Node methods

```ts
getNodeIPs(): Promise<Record<string, NodeEntry>>
getNodeHosts(): Promise<Record<string, NodeEntry>>
```

## Types

Exported core types:

- `CheckResponse`
- `CheckOptions`
- `CheckResult`
- `PingResult`
- `HttpResult`
- `TcpResult`
- `DnsResult`
- `ExtendedResult<T>`
- `NodeEntry`
- `NodeInfo`
- `CheckHostError`

## Error handling

The library throws `CheckHostError` for:

- non-2xx API responses (`statusCode` is HTTP status)
- network failures (`statusCode` is `0`)
- non-JSON responses when JSON is expected
- invalid method input (empty `host`/`requestId`, invalid `maxNodes`, empty node names)
- malformed API payloads that do not match documented response shapes

```ts
import { CheckHostError } from "checkhost-ts";

try {
  await checkHttp("check-host.net");
} catch (error) {
  if (error instanceof CheckHostError) {
    console.error(error.statusCode, error.message);
  }
}
```
