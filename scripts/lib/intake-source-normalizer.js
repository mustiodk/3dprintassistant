function canonicalSource(input) {
  const url = new URL(String(input));
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('canonical source must use http or https');
  }

  url.hash = '';
  const tracking = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'ref',
  ];
  for (const key of tracking) url.searchParams.delete(key);
  url.searchParams.sort();

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const query = url.searchParams.toString();
  return `${host}${pathname}${query ? `?${query}` : ''}`;
}

module.exports = { canonicalSource };
