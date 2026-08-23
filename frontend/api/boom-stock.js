// Vercel / Netlify serverless function: proxy to Boom Sistemas stock endpoint
// Expects environment variables (set these in Vercel/Netlify project settings):
// BOOM_API_URL, BOOM_USERNAME, BOOM_PASSWORD, BOOM_CNPJ
// Optional: CACHE_TTL_SECONDS (default 60)

// Simple in-memory cache (per-warm-instance). Good to reduce requests to Boom for high-traffic pages.
const _cache = new Map();

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
    BOOM_CNPJ,
    CACHE_TTL_SECONDS
  } = process.env;

  if (!BOOM_API_URL || !BOOM_USERNAME || !BOOM_PASSWORD || !BOOM_CNPJ) {
    return res.status(500).json({ error: 'Server misconfigured: missing BOOM_API_URL, BOOM_USERNAME, BOOM_PASSWORD or BOOM_CNPJ' });
  }

  const cnpj = String(BOOM_CNPJ).replace(/\D/g, '');
  if (cnpj.length !== 14) {
    return res.status(500).json({ error: 'Server misconfigured: BOOM_CNPJ must contain 14 digits' });
  }

  const query = new URLSearchParams();
  const allowedFilters = ['page', 'modelo', 'marca', 'status'];
  for (const filter of allowedFilters) {
    const value = req.query[filter];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      query.set(filter, String(value).trim());
    }
  }

  const queryString = query.toString();
  const cacheKey = queryString || 'default';
  const ttl = Math.max(0, parseInt(CACHE_TTL_SECONDS || '60', 10));
  const now = Date.now();
  const cached = _cache.get(cacheKey);

  // Return cached response if still valid
  if (cached && cached.expiresAt > now) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(cached.data);
  }

  try {
    const base = BOOM_API_URL.replace(/\/$/, '');
    const url = `${base}/v1/loja/${cnpj}/veiculo/estoque${queryString ? `?${queryString}` : ''}`;

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

    const imageBaseUrl = 'https://arquivos.boomsistemas.com.br/veiculos/';
    const withImageUrls = (vehicle) => {
      if (!vehicle || typeof vehicle !== 'object') return vehicle;
      const gallery = Array.isArray(vehicle.galeria) ? vehicle.galeria : [];
      const normalizedGallery = gallery.map((item) => {
        const relativeUrl = item && typeof item.veiculo_galeria_url === 'string' ? item.veiculo_galeria_url.trim() : '';
        return {
          ...item,
          veiculo_galeria_full_url: relativeUrl ? `${imageBaseUrl}${relativeUrl}` : null
        };
      });
      const firstImage = normalizedGallery.find((item) => item.veiculo_galeria_full_url)?.veiculo_galeria_full_url || null;
      return {
        ...vehicle,
        galeria: normalizedGallery,
        fotoUrl: firstImage,
        fotosUrls: normalizedGallery
          .map((item) => item.veiculo_galeria_full_url)
          .filter(Boolean)
      };
    };

    let normalized = data;
    if (Array.isArray(data)) {
      normalized = data.map(withImageUrls);
    } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
      normalized = { ...data, data: data.data.map(withImageUrls) };
    }

    _cache.set(cacheKey, {
      data: normalized,
      expiresAt: now + ttl * 1000
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(normalized);
  } catch (err) {
    return res.status(500).json({ error: 'Integration error', message: err.message });
  }
}
