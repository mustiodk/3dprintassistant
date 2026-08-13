#!/usr/bin/env node
const assert = require("assert/strict");
const { loadBrowserScript } = require("./load-browser-script");
const { reviewRequestMetric } = loadBrowserScript(
  "analytics-dashboard-helpers.js",
  ["reviewRequestMetric"]
);

assert.deepEqual(reviewRequestMetric([], "ios", false), { available: true, value: 0 });
assert.deepEqual(reviewRequestMetric([], "ios", true), { available: false, value: null });
assert.deepEqual(reviewRequestMetric([
  { platform: "ios", requests: 2 },
  { platform: "ios", requests: "3" },
  { platform: "web", requests: 9 },
], "ios", false), { available: true, value: 5 });
assert.deepEqual(reviewRequestMetric([
  { platform: "ios", requests: 2 },
  { platform: "web", requests: 9 },
], "all", false), { available: true, value: 11 });

console.log("analytics-dashboard-helpers: all tests passed");
