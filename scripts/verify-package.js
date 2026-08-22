const assert = require("assert").strict;
const { execFileSync } = require("child_process");
const { mkdtempSync, mkdirSync, rmSync, writeFileSync } = require("fs");
const { createRequire } = require("module");
const { tmpdir } = require("os");
const path = require("path");

const expectedFiles = ["CHANGELOG.md", "LICENSE", "README.md", "index.js", "package.json"];
const temporaryRoot = mkdtempSync(path.join(tmpdir(), "wakatime-promise-package-"));

try {
  const packOutput = execFileSync("npm", ["pack", "--json", "--pack-destination", temporaryRoot], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
  });
  const [packResult] = JSON.parse(packOutput);
  assert.deepEqual(packResult.files.map(({ path: filePath }) => filePath).sort(), expectedFiles);

  const consumerDirectory = path.join(temporaryRoot, "consumer");
  mkdirSync(consumerDirectory);
  writeFileSync(path.join(consumerDirectory, "package.json"), '{"private":true}');
  const tarball = path.join(temporaryRoot, packResult.filename);
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], {
    cwd: consumerDirectory,
    stdio: "pipe",
  });

  const consumerRequire = createRequire(path.join(consumerDirectory, "index.js"));
  const createWakaTime = consumerRequire("wakatime-promise");
  const client = createWakaTime("synthetic-api-key");
  assert.deepEqual(Object.keys(client).sort(), [
    "currentUser",
    "last30Days",
    "last6Months",
    "last7Days",
    "lastYear",
    "summaries",
  ]);
  console.log(`Verified package contents and CommonJS API for ${packResult.filename}`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
