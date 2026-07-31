const COLUMNS = [
  ["report_id", "reportId"], ["schema_version", "schemaVersion"], ["category", "category"],
  ["source", "source"], ["received_at", "receivedAt"], ["captured_at", "capturedAt"],
  ["app_version", "appVersion"], ["build_number", "buildNumber"], ["release_channel", "releaseChannel"],
  ["physical_printer", "physicalPrinter"], ["selected_printer", "selectedPrinter"], ["error_code", "errorCode"],
  ["diagnostic_completeness", "diagnosticCompleteness"],
  ["user_content_ciphertext", "userContentCiphertext"], ["user_content_iv", "userContentIv"],
  ["diagnostics_json", "diagnosticsJson"], ["breadcrumbs_json", "breadcrumbsJson"],
  ["issue_fingerprint", "issueFingerprint"], ["expires_at", "expiresAt"],
];

export async function insertFeedbackReport(db, row) {
  const names = COLUMNS.map(([name]) => name);
  await db.prepare(`INSERT INTO feedback_reports (${names.join(",")}) VALUES (${names.map(() => "?").join(",")})`)
    .bind(...COLUMNS.map(([, property]) => row[property] ?? null)).run();
}

export async function persistFeedbackReport(db, buildStoredReport, createId, maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const reportId = createId();
    try {
      await insertFeedbackReport(db, await buildStoredReport(reportId));
      return reportId;
    } catch (error) {
      const message = String(error?.message || error);
      if (!/UNIQUE constraint failed: feedback_reports\.report_id/i.test(message)) throw error;
    }
  }
  throw new Error("report_id_unavailable");
}

export async function readFeedbackReport(db, reportId) {
  return db.prepare("SELECT * FROM feedback_reports WHERE report_id = ?").bind(reportId).first();
}

export async function listFeedbackReports(db, limit = 50, offset = 0) {
  const boundedLimit = Math.max(1, Math.min(100, Number(limit) || 50));
  const boundedOffset = Math.max(0, Number(offset) || 0);
  const result = await db.prepare(`SELECT report_id, schema_version, category, source, received_at, disposition,
    app_version, build_number, release_channel, physical_printer, selected_printer, error_code, issue_fingerprint
    FROM feedback_reports ORDER BY received_at DESC, report_id DESC LIMIT ? OFFSET ?`)
    .bind(boundedLimit, boundedOffset).all();
  return result.results || [];
}

export async function listFingerprintMatches(db, fingerprint, excludeReportId, limit = 20) {
  const result = await db.prepare(`SELECT report_id, received_at, app_version, disposition, error_code
    FROM feedback_reports WHERE issue_fingerprint = ? AND report_id != ?
    ORDER BY received_at DESC LIMIT ?`).bind(fingerprint, excludeReportId, Math.min(50, Math.max(1, limit))).all();
  return result.results || [];
}

export async function setFeedbackDisposition(db, reportId, disposition) {
  const result = await db.prepare("UPDATE feedback_reports SET disposition = ? WHERE report_id = ?").bind(disposition, reportId).run();
  return (result.meta?.changes || 0) > 0;
}

export async function deleteFeedbackReport(db, reportId) {
  const result = await db.prepare("DELETE FROM feedback_reports WHERE report_id = ?").bind(reportId).run();
  return (result.meta?.changes || 0) > 0;
}

export async function deleteExpiredFeedbackReports(db, nowIso) {
  const result = await db.prepare("DELETE FROM feedback_reports WHERE expires_at <= ?").bind(nowIso).run();
  return result.meta?.changes || 0;
}
