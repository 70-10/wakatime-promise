# wakatime-promise

A small, dependency-free Promise client for the WakaTime API.

## Requirements

- Node.js 22.13 or later in the Node.js 22 LTS line
- Node.js 24 LTS
- A secret WakaTime API key

This package is for server-side Node.js applications. Never expose a WakaTime API key in browser code, public client-side JavaScript, URLs, logs, or source control.

## Install

```sh
npm install wakatime-promise
```

## Usage

```js
const wakatime = require("wakatime-promise")(process.env.WAKATIME_API_KEY);
```

Each API method returns a Promise that resolves to the parsed WakaTime JSON response without wrapping or reshaping it.

```js
async function loadStats(wakatime) {
  return wakatime.last7Days();
}
```

## API

### `wakatime(apiKey)`

Creates a client using WakaTime HTTP Basic authentication. `apiKey` must be a non-empty string. Invalid keys cause API methods to return a rejected Promise before a request is sent.

### `wakatime.currentUser()`

Returns the current WakaTime user.

### `wakatime.last7Days()`

Returns stats for the last seven days.

### `wakatime.last30Days()`

Returns stats for the last 30 days.

### `wakatime.last6Months()`

Returns stats for the last six months.

### `wakatime.lastYear()`

Returns stats for the last year.

WakaTime may respond to a stats request with `202 Accepted` while refreshing stale stats. A 202 JSON response resolves normally; callers can inspect WakaTime's `is_up_to_date` response field and retry when appropriate.

### `wakatime.summaries(start, end)`

Returns summaries for an inclusive date range.

- `start`: a real calendar date in `YYYY-MM-DD` format
- `end`: a real calendar date in `YYYY-MM-DD` format
- `start` must be earlier than or equal to `end`

Invalid ranges return a rejected Promise before a request is sent.

## Errors and timeouts

Requests time out after 30 seconds. DNS, TLS, socket, aborted-response, premature-close, timeout, empty-response, and invalid-JSON failures reject the Promise.

Redirects and HTTP error statuses reject with an `Error` whose `name` is `WakaTimeApiError`. The error has these inspectable properties:

- `statusCode`: the HTTP status code
- `resource`: the requested WakaTime API resource
- `body`: the parsed JSON error body, the raw response text when it is not JSON, or `null` for an empty body

```js
async function loadCurrentUser(wakatime) {
  try {
    return await wakatime.currentUser();
  } catch (error) {
    if (error.name === "WakaTimeApiError") {
      console.error(error.statusCode, error.resource, error.body);
    }
    throw error;
  }
}
```

Transport timeout errors have `code` set to `ETIMEDOUT`. API keys are never included in request URLs or generated error messages.

## Development

```sh
npm ci
npm run check
npm pack --dry-run
```

Tests use synthetic credentials and mocked HTTPS requests. They do not contact WakaTime.
