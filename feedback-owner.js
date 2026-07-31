(function (root) {
  'use strict';
  const dispositions = Object.freeze(['new', 'needs_info', 'actionable', 'fixed', 'duplicate', 'unsupported', 'not_reproducible', 'closed_other']);
  function escape(value) {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }
  function pretty(value) { return escape(String(value ?? '-').replaceAll('_', ' ')); }
  function buildRequest(token, payload) {
    return { url: '/api/feedback-admin', init: { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Analytics-Admin-Token': token }, body: JSON.stringify(payload) } };
  }
  function renderList(reports) {
    if (!reports?.length) return '<div class="empty">No feedback reports.</div>';
    return `<table><thead><tr><th>Report</th><th>Date</th><th>Source</th><th>Category</th><th>Printer</th><th>Error</th><th>Status</th></tr></thead><tbody>${reports.map((row) => `<tr data-report-id="${escape(row.report_id)}"><td><button class="feedback-link" data-feedback-open="${escape(row.report_id)}">${escape(row.report_id)}</button></td><td>${escape(row.received_at)}</td><td>${escape(row.source)} ${escape(row.app_version || '')}</td><td>${pretty(row.category)}</td><td>${escape(row.physical_printer || 'unknown')} / ${escape(row.selected_printer || 'unknown')}</td><td>${escape(row.error_code || '-')}</td><td>${pretty(row.disposition)}</td></tr>`).join('')}</tbody></table>`;
  }
  function renderDetail(report, matches) {
    const user = report.userContent || { error: report.userContentError || 'unavailable' };
    const options = dispositions.map((value) => `<option value="${value}"${report.disposition === value ? ' selected' : ''}>${pretty(value)}</option>`).join('');
    return `<div class="feedback-detail-head"><strong>${escape(report.report_id)}</strong><select data-feedback-disposition>${options}</select><button class="primary" data-feedback-save>Save status</button><button class="danger" data-feedback-delete>Delete</button></div><h3>User report</h3><pre>${escape(JSON.stringify(user, null, 2))}</pre><h3>Diagnostics</h3><pre>${escape(JSON.stringify(report.diagnostics || {}, null, 2))}</pre><h3>Recent actions</h3><pre>${escape(JSON.stringify(report.breadcrumbs || [], null, 2))}</pre><h3>Fingerprint matches</h3>${matches?.length ? `<ul>${matches.map((row) => `<li>${escape(row.report_id)} · ${pretty(row.disposition)} · ${escape(row.received_at || '')}</li>`).join('')}</ul>` : '<p class="empty">No other matching reports.</p>'}`;
  }
  root.FeedbackOwner = { dispositions, escape, buildRequest, renderList, renderDetail };
})(globalThis);
