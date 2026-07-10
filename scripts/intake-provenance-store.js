function upsertPrinterProvenance(doc, printerId, provenance) {
  const next = JSON.parse(JSON.stringify(doc || {}));
  next.schema = next.schema || 'printer-provenance@1';
  next.printers = next.printers || {};
  next.printers[printerId] = JSON.parse(JSON.stringify(provenance));
  return next;
}

module.exports = { upsertPrinterProvenance };
