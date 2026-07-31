function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value ?? null;
}

function encryptionKeyBytes(keyBase64) {
  const bytes = base64ToBytes(keyBase64);
  if (bytes.length !== 32) throw new Error("invalid_feedback_data_key");
  return bytes;
}

export function createReportId() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return `RPT-${bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")}`;
}

export async function fingerprintReport(report) {
  const failure = report.diagnostics?.failure || {};
  const config = report.diagnostics?.configuration || {};
  const stable = {
    code: failure.code || null,
    exportType: config.exportType || null,
    operation: failure.operation || null,
    platform: report.source || report.summary?.platform || null,
    printer: report.summary?.selectedPrinter || config.printer || null,
    slicer: config.slicer || null,
    subsystem: failure.subsystem || null,
  };
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(stableValue(stable))));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function encryptUserContent(value, keyBase64, reportId, schemaVersion) {
  const key = await crypto.subtle.importKey("raw", encryptionKeyBytes(keyBase64), "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const additionalData = new TextEncoder().encode(`${reportId}\n${schemaVersion}`);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData }, key, new TextEncoder().encode(JSON.stringify(value)));
  return { ciphertext: bytesToBase64(new Uint8Array(ciphertext)), iv: bytesToBase64(iv) };
}

export async function decryptUserContent(ciphertext, iv, keyBase64, reportId, schemaVersion) {
  const key = await crypto.subtle.importKey("raw", encryptionKeyBytes(keyBase64), "AES-GCM", false, ["decrypt"]);
  const additionalData = new TextEncoder().encode(`${reportId}\n${schemaVersion}`);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv), additionalData }, key, base64ToBytes(ciphertext));
  return JSON.parse(new TextDecoder().decode(plaintext));
}
