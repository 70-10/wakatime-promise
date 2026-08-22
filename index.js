const https = require("https");

const REQUEST_TIMEOUT_MS = 30000;

module.exports = (apiKey) => ({
  last7Days: () => request(apiKey, "/users/current/stats/last_7_days"),
  last30Days: () => request(apiKey, "/users/current/stats/last_30_days"),
  last6Months: () => request(apiKey, "/users/current/stats/last_6_months"),
  lastYear: () => request(apiKey, "/users/current/stats/last_year"),
  summaries: (start, end) => request(apiKey, () => summariesResource(start, end)),
  currentUser: () => request(apiKey, "/users/current"),
});

function apiKeyBase64(apiKey) {
  return Buffer.from(apiKey).toString("base64");
}

function summariesResource(start, end) {
  validateDate("start", start);
  validateDate("end", end);
  if (start > end) {
    throw new TypeError("start must be earlier than or equal to end");
  }
  return `/users/current/summaries?${new URLSearchParams({ start, end })}`;
}

function validateDate(name, value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`${name} must be a valid date in YYYY-MM-DD format`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new TypeError(`${name} must be a valid date in YYYY-MM-DD format`);
  }
}

function request(apiKey, resourceValue) {
  return new Promise((resolve, reject) => {
    if (typeof apiKey !== "string" || apiKey.trim() === "") {
      reject(new TypeError("apiKey must be a non-empty string"));
      return;
    }

    let resource;
    try {
      resource = typeof resourceValue === "function" ? resourceValue() : resourceValue;
    } catch (error) {
      reject(error);
      return;
    }

    const options = {
      port: 443,
      hostname: "api.wakatime.com",
      path: `/api/v1${resource}`,
      method: "GET",
      headers: { Authorization: `Basic ${apiKeyBase64(apiKey)}` },
    };

    let settled = false;
    const settle = (callback, value) => {
      if (!settled) {
        settled = true;
        callback(value);
      }
    };
    const fail = (error) => {
      if (error && typeof error === "object" && !("resource" in error)) {
        error.resource = resource;
      }
      settle(reject, error);
    };

    const req = https.request(options, (res) => {
      let responseBody = "";
      res.on("data", (data) => {
        responseBody += data;
      });
      res.on("error", fail);
      res.on("aborted", () => fail(new Error(`WakaTime API response aborted for ${resource}`)));
      res.on("close", () => {
        if (!res.complete) {
          fail(new Error(`WakaTime API response closed before completion for ${resource}`));
        }
      });
      res.on("end", () => {
        const statusCode = res.statusCode;
        if (statusCode >= 200 && statusCode < 300) {
          if (responseBody === "") {
            fail(new SyntaxError(`WakaTime API returned an empty response for ${resource}`));
            return;
          }
          try {
            settle(resolve, JSON.parse(responseBody));
          } catch (error) {
            fail(error);
          }
          return;
        }

        const error = new Error(`WakaTime API request failed with status ${statusCode} for ${resource}`);
        error.name = "WakaTimeApiError";
        error.statusCode = statusCode;
        error.resource = resource;
        if (responseBody === "") {
          error.body = null;
        } else {
          try {
            error.body = JSON.parse(responseBody);
          } catch (_error) {
            error.body = responseBody;
          }
        }
        fail(error);
      });
    });

    req.on("error", fail);
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      const error = new Error(`WakaTime API request timed out after ${REQUEST_TIMEOUT_MS}ms for ${resource}`);
      error.code = "ETIMEDOUT";
      req.destroy(error);
    });
    req.end();
  });
}
