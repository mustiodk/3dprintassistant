(function (root) {
  "use strict";

  function reviewRequestMetric(rows, platform, queryFailed) {
    if (queryFailed) return { available: false, value: null };
    const value = (Array.isArray(rows) ? rows : [])
      .filter(row => platform === "all" || row.platform === platform)
      .reduce((total, row) => total + (Number(row.requests) || 0), 0);
    return { available: true, value };
  }

  root.AnalyticsDashboardHelpers = Object.freeze({ reviewRequestMetric });
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { reviewRequestMetric };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
