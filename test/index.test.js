const assert = require("assert").strict;
const { EventEmitter } = require("events");
// eslint-disable-next-line node/no-missing-require
const test = require("node:test");
const https = require("https");

const createWakaTime = require("..");
const API_KEY = "test-api-key";
const originalRequest = https.request;

test.afterEach(() => {
  https.request = originalRequest;
});

function stubRequest(scenario = {}) {
  const calls = [];
  https.request = (options, callback) => {
    const request = new EventEmitter();
    let timeoutHandler;
    calls.push({ options, request });
    request.setTimeout = (timeout, handler) => {
      request.timeout = timeout;
      timeoutHandler = handler;
    };
    request.destroy = (error) => request.emit("error", error);
    request.end = () => {
      setImmediate(() => {
        if (scenario.requestError) {
          request.emit("error", scenario.requestError);
          return;
        }
        if (scenario.timeout) {
          timeoutHandler();
          return;
        }
        const response = new EventEmitter();
        response.statusCode = scenario.statusCode === undefined ? 200 : scenario.statusCode;
        response.complete = !scenario.prematureClose;
        callback(response);
        if (scenario.responseError) {
          response.emit("error", scenario.responseError);
          return;
        }
        if (scenario.aborted) {
          response.complete = false;
          response.emit("aborted");
          response.emit("close");
          return;
        }
        const body = Object.prototype.hasOwnProperty.call(scenario, "rawBody")
          ? scenario.rawBody
          : JSON.stringify(scenario.body === undefined ? { data: { ok: true } } : scenario.body);
        if (body !== "") response.emit("data", body);
        if (scenario.prematureClose) {
          response.emit("close");
          return;
        }
        response.emit("end");
        response.emit("close");
      });
    };
    return request;
  };
  return calls;
}

test("exports the existing CommonJS public API", () => {
  const wakatime = createWakaTime(API_KEY);
  assert.equal(typeof createWakaTime, "function");
  assert.deepEqual(Object.keys(wakatime).sort(), [
    "currentUser",
    "last30Days",
    "last6Months",
    "last7Days",
    "lastYear",
    "summaries",
  ]);
});

const cases = [
  ["currentUser", [], "/api/v1/users/current"],
  ["last7Days", [], "/api/v1/users/current/stats/last_7_days"],
  ["last30Days", [], "/api/v1/users/current/stats/last_30_days"],
  ["last6Months", [], "/api/v1/users/current/stats/last_6_months"],
  ["lastYear", [], "/api/v1/users/current/stats/last_year"],
  ["summaries", ["2020-01-01", "2020-01-31"], "/api/v1/users/current/summaries?start=2020-01-01&end=2020-01-31"],
];

for (const [method, args, expectedPath] of cases) {
  test(`${method} requests ${expectedPath}`, async () => {
    const body = { data: { method } };
    const calls = stubRequest({ body });
    const resultPromise = createWakaTime(API_KEY)[method](...args);
    assert.ok(resultPromise instanceof Promise);
    assert.deepEqual(await resultPromise, body);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[0].options.hostname, "api.wakatime.com");
    assert.equal(calls[0].options.path, expectedPath);
    assert.equal(calls[0].options.headers.Authorization, `Basic ${Buffer.from(API_KEY).toString("base64")}`);
    assert.equal(calls[0].request.timeout, 30000);
  });
}

test("resolves a 202 JSON response without changing its shape", async () => {
  const body = { data: { is_up_to_date: false } };
  stubRequest({ statusCode: 202, body });
  assert.deepEqual(await createWakaTime(API_KEY).lastYear(), body);
});

for (const rawBody of ["", "{"]) {
  test(`rejects a successful response with ${rawBody ? "malformed JSON" : "an empty body"}`, async () => {
    stubRequest({ rawBody });
    await assert.rejects(createWakaTime(API_KEY).currentUser(), SyntaxError);
  });
}

for (const statusCode of [301, 400, 401, 403, 404, 429, 500]) {
  test(`rejects HTTP ${statusCode} with response details`, async () => {
    const body = { error: `status ${statusCode}` };
    stubRequest({ statusCode, body });
    await assert.rejects(createWakaTime(API_KEY).currentUser(), (error) => {
      assert.equal(error.name, "WakaTimeApiError");
      assert.equal(error.statusCode, statusCode);
      assert.equal(error.resource, "/users/current");
      assert.deepEqual(error.body, body);
      return true;
    });
  });
}

test("preserves a non-JSON HTTP error body as text", async () => {
  stubRequest({ statusCode: 500, rawBody: "unavailable" });
  await assert.rejects(createWakaTime(API_KEY).currentUser(), { body: "unavailable" });
});

for (const [name, scenario, pattern] of [
  ["request errors", { requestError: new Error("socket failed") }, /socket failed/],
  ["response errors", { responseError: new Error("response failed") }, /response failed/],
  ["aborted responses", { aborted: true }, /aborted/],
  ["prematurely closed responses", { prematureClose: true }, /closed before completion/],
]) {
  test(`rejects ${name}`, async () => {
    stubRequest(scenario);
    await assert.rejects(createWakaTime(API_KEY).currentUser(), pattern);
  });
}

test("rejects timed out requests", async () => {
  stubRequest({ timeout: true });
  await assert.rejects(createWakaTime(API_KEY).currentUser(), (error) => error.code === "ETIMEDOUT");
});

for (const apiKey of [undefined, null, "", "   ", 123]) {
  test(`rejects invalid API key ${JSON.stringify(apiKey)} before requesting`, async () => {
    const calls = stubRequest();
    const result = createWakaTime(apiKey).currentUser();
    assert.ok(result instanceof Promise);
    await assert.rejects(result, /apiKey must be a non-empty string/);
    assert.equal(calls.length, 0);
  });
}

for (const [start, end] of [
  [undefined, "2020-01-01"],
  ["2020-01-01", undefined],
  ["2020-02-30", "2020-03-01"],
  ["2020-1-01", "2020-01-31"],
  ["2020-02-01", "2020-01-31"],
  ["2020-01-01&project=secret", "2020-01-31"],
]) {
  test(`rejects invalid summary range ${start} to ${end} before requesting`, async () => {
    const calls = stubRequest();
    await assert.rejects(createWakaTime(API_KEY).summaries(start, end), TypeError);
    assert.equal(calls.length, 0);
  });
}

test("accepts leap days and equal summary dates", async () => {
  const calls = stubRequest();
  await createWakaTime(API_KEY).summaries("2024-02-29", "2024-02-29");
  assert.equal(calls[0].options.path, "/api/v1/users/current/summaries?start=2024-02-29&end=2024-02-29");
});
