// Vercel / Netlify serverless function: proxy to Boom Sistemas fullestoque endpoint
// Expects environment variables (set these in Vercel/Netlify project settings):
// BOOM_API_URL, BOOM_USERNAME, BOOM_PASSWORD, FILIAL, USUARIO
// Optional: CACHE_TTL_SECONDS (default 60)

// Simple in-memory cache (per-warm-instance). Good to reduce requests to Boom for high-traffic pages.
let _cache = { data: null, expiresAt: 0 };

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    BOOM_API_URL,
    BOOM_USERNAME,
    BOOM_PASSWORD,
    FILIAL,
    USUARIO,
    CACHE_TTL_SECONDS
  } = process.env;

  if (!BOOM_API_URL || !BOOM_USERNAME || !BOOM_PASSWORD || !FILIAL || !USUARIO) {
    return res.status(500).json({ error: 'Server misconfigured: missing BOOM_API_URL, BOOM_USERNAME, BOOM_PASSWORD, FILIAL or USUARIO' });
  }

  const ttl = Math.max(0, parseInt(CACHE_TTL_SECONDS || '60', 10));
  const now = Date.now();

  // Return cached response if still valid
  if (_cache.data && _cache.expiresAt > now) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(_cache.data);
  }

  try {
    const base = BOOM_API_URL.replace(/\/$/, '');
    const url = `${base}/api/fullestoque/filial/${FILIAL}/user/${USUARIO}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Username': BOOM_USERNAME,
        'Password': BOOM_PASSWORD,
        'Accept': 'application/json'
      }
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = text; }

    if (!response.ok) {
      return res.status(502).json({ error: 'Boom API error', status: response.status, details: data });
    }

    // cache result
    _cache.data = data;
    _cache.expiresAt = now + ttl * 1000;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Integration error', message: err.message });
  }
}
