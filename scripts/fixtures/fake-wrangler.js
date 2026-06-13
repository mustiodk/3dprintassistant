#!/usr/bin/env node
// Test double for the wrangler CLI — lets printer-intake-scout.test.js exercise
// the real --source kv code path (list → get → parse → classify → watermark)
// OFFLINE, with no Cloudflare account. Pointed at via --wrangler-bin.
//
// Recognises: `kv key list --namespace-id <ns>`  → JSON array of {name}
//             `kv key get  --namespace-id <ns> <key>` → the stored value
//
// The canned queue deliberately includes a normal entry, a malformed value, and
// an entry with no receivedAt, so the tests can assert error-surfacing + the
// watermark/timestamp behaviour.

const VALUES = {
  'req:ok': JSON.stringify({
    fields: [
      { id: 'brand', label: 'Brand', value: 'Creality' },
      { id: 'model', label: 'Model', value: 'Ender-9000' },
    ],
    email: 'requester@example.com',
    receivedAt: '2026-06-13T10:00:00.000Z',
  }),
  'req:bad': '{ this is not valid json',
  'req:nots': JSON.stringify({
    fields: [
      { id: 'brand', label: 'Brand', value: 'Sovol' },
      { id: 'model', label: 'Model', value: 'SV-Future' },
    ],
    email: null,
    // intentionally NO receivedAt
  }),
};

const a = process.argv.slice(2);
if (a[0] === 'kv' && a[1] === 'key' && a[2] === 'list') {
  process.stdout.write(JSON.stringify(Object.keys(VALUES).map(name => ({ name }))));
  process.exit(0);
}
if (a[0] === 'kv' && a[1] === 'key' && a[2] === 'get') {
  const key = a[a.length - 1];
  if (!(key in VALUES)) { process.stderr.write(`key not found: ${key}`); process.exit(1); }
  process.stdout.write(VALUES[key]);
  process.exit(0);
}
process.stderr.write(`fake-wrangler: unhandled args: ${a.join(' ')}`);
process.exit(1);
