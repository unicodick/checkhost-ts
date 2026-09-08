# checkhost-ts

Lightweight TypeScript wrapper for the [check-host.net](https://check-host.net) API.

```bash
npm install checkhost-ts
```

---

```ts
import { checkHttp, waitForResult } from "checkhost-ts";

const check = await checkHttp("check-host.net", { maxNodes: 1 });
const result = await waitForResult(check.request_id, { type: "http" });

console.log(check.request_id);
console.log(result);
```

## API

### `apiFetch(path, params?)`

Low-level helper for direct API calls.

```ts
apiFetch(
  path: string,
  params?: Record<string, string | string[]>,
  options?: RequestOptions,
): Promise<unknown>
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
  signal?: AbortSignal;
  timeoutMs?: number;
};
```

- `maxNodes`: limits number of checker nodes (`max_nodes` in API).
- `nodes`: explicit node list (sent as repeated `node` query params).
- `signal`: abort signal for request cancellation.
- `timeoutMs`: positive integer request timeout in milliseconds.

### Result methods

```ts
getResult(requestId: string, options?: RequestOptions): Promise<CheckResult>
getResult<T extends CheckType>(requestId: string, options: ResultOptions<T>): Promise<CheckResultFor<T>>
getResultExtended(requestId: string, options?: RequestOptions): Promise<ExtendedCheckResult>
waitForResult(requestId: string, options?: WaitForResultOptions): Promise<CheckResult>
waitForResult<T extends CheckType>(requestId: string, options: WaitForResultOptions<T> & { type: T }): Promise<CheckResultFor<T>>
```

`requestId` is URL-encoded by the library before request execution.

Pass `type` to get a specific result type and validate that shape at runtime:

```ts
const result = await getResult(check.request_id, { type: "http" });
// result is HttpResult
```

Checks run asynchronously. `getResult` performs one request and may return `null` for nodes that are still working. `waitForResult` polls until every node is complete:

```ts
const result = await waitForResult(check.request_id, {
  type: "http",
  intervalMs: 1_000,       // default: 1 second
  timeoutMs: 30_000,       // total polling deadline
  requestTimeoutMs: 5_000, // timeout for each HTTP request
  signal,
});
```

### Node methods

```ts
getNodeIPs(options?: RequestOptions): Promise<string[]>
getNodeHosts(options?: RequestOptions): Promise<Record<string, NodeEntry>>
```

## Types

Exported core types:

- `CheckResponse`
- `CheckOptions`
- `RequestOptions`
- `CheckResult`
- `CheckResultMap`
- `CheckResultFor<T>`
- `CheckType`
- `PingResult`
- `HttpResult`
- `TcpResult`
- `DnsResult`
- `UdpResult`
- `ExtendedResult<T>`
- `ExtendedCheckResult`
- `ResultOptions<T>`
- `WaitForResultOptions<T>`
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
    console.error(error.kind, error.statusCode, error.message);
    console.error(error.url, error.responseBody, error.cause);
  }
}
```

`kind` distinguishes `validation`, `network`, `timeout`, `aborted`, `http`, and malformed `response` errors.
HTTP failures may include a parsed `responseBody`; transport failures preserve their original `cause`.
