const https = require("https");

module.exports = (apiKey) => ({
  last7Days: () => request(apiKey, "/users/current/stats/last_7_days"),
  last30Days: () => request(apiKey, "/users/current/stats/last_30_days"),
  last6Months: () => request(apiKey, "/users/current/stats/last_6_months"),
  lastYear: () => request(apiKey, "/users/current/stats/last_year"),
  summaries: (start, end) => request(apiKey, `/users/current/summaries?start=${start}&end=${end}`),
  currentUser: () => request(apiKey, "/users/current"),
});

function apiKeyBase64(apiKey) {
  const apiKeyBuffer = Buffer.from(apiKey);
  return apiKeyBuffer.toString("base64");
}

function request(apiKey, path) {
  const options = {
    port: 443,
    hostname: "wakatime.com",
    path: `/api/v1${path}`,
    method: "GET",
    headers: {
      Authorization: `Basic ${apiKeyBase64(apiKey)}`,
    },
  };
  return new Promise((resolve, reject) => {
    let responseBody = "";
    const req = https.request(options, (res) => {
      res.on("data", (data) => {
        responseBody += data;
      });

      res.on("end", () => {
        try {
          const bodyJSON = JSON.parse(responseBody);
          resolve(bodyJSON);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.end();
  });
}
