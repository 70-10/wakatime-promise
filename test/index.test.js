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

function stubRequest({ body = { data: { ok: true } }, malformed = false } = {}) {
  const calls = [];

  https.request = (options, callback) => {
    calls.push(options);

    const request = new EventEmitter();
    request.end = () => {
      setImmediate(() => {
        const response = new EventEmitter();
        callback(response);
        response.emit("data", malformed ? "{" : JSON.stringify(body));
        response.emit("end");
      });
    };

    return request;
  };

  return calls;
}

test("exports a CommonJS factory with the existing public methods", () => {
  assert.equal(typeof createWakaTime, "function");

  const wakatime = createWakaTime(API_KEY);

  assert.deepEqual(Object.keys(wakatime).sort(), [
    "currentUser",
    "last30Days",
    "last6Months",
    "last7Days",
    "lastYear",
    "summaries",
  ]);
  for (const method of Object.values(wakatime)) {
    assert.equal(typeof method, "function");
  }
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
  test(`${method} returns a Promise and requests ${expectedPath}`, async () => {
    const body = { data: { method } };
    const calls = stubRequest({ body });
    const resultPromise = createWakaTime(API_KEY)[method](...args);

    assert.ok(resultPromise instanceof Promise);
    assert.deepEqual(await resultPromise, body);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "GET");
    assert.equal(calls[0].hostname, "wakatime.com");
    assert.equal(calls[0].path, expectedPath);
    assert.equal(calls[0].headers.Authorization, `Basic ${Buffer.from(API_KEY).toString("base64")}`);
  });
}

test("resolves successful JSON without changing its shape", async () => {
  const body = { data: { nested: [1, { value: true }] }, meta: { status: "ok" } };
  stubRequest({ body });

  assert.deepEqual(await createWakaTime(API_KEY).currentUser(), body);
});

test("rejects malformed JSON", async () => {
  stubRequest({ malformed: true });

  await assert.rejects(createWakaTime(API_KEY).currentUser(), SyntaxError);
});
