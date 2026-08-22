# Changelog

## 2.0.0 (Unreleased)

This is a major release because it removes support for end-of-life Node.js versions and changes previously successful HTTP error responses into Promise rejections.

### Changed

- Require a supported Node.js 22 or 24 LTS release.
- Send requests to the documented `api.wakatime.com` API host.
- Reject redirects and HTTP error responses with inspectable status, resource, and response-body information.
- Reject transport failures, aborted responses, premature closes, and requests that exceed the 30-second timeout.
- Reject missing API keys and invalid summary date ranges before sending a request.
- Require summary dates to be real `YYYY-MM-DD` calendar dates in chronological order.

### Preserved

- CommonJS consumption.
- Existing public method names and argument order.
- API-key Basic authentication.
- Parsed WakaTime response objects for successful JSON responses, including `202 Accepted`.
