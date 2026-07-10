const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalSource } = require('./intake-source-normalizer.js');

test('canonicalSource ignores case, fragments, and tracking params', () => {
  assert.equal(
    canonicalSource('HTTPS://Creality.COM/products/k2-se?utm_source=x&ref=abc#specs'),
    'creality.com/products/k2-se'
  );
});

test('canonicalSource removes www, trailing slashes, and query-order drift', () => {
  assert.equal(
    canonicalSource('https://www.CREALITY.com/products/k2-se/?z=2&a=1&utm_medium=email'),
    'creality.com/products/k2-se?a=1&z=2'
  );
});

test('canonicalSource rejects non-http sources', () => {
  assert.throws(() => canonicalSource('file:///tmp/source.html'), /http/i);
});
