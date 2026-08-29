const _cache = new Map();

export default async function handler(req, res) {
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
    BOOM_FILIAL,
    BOOM_USUARIO,
    BOOM_CNPJ,
    CACHE_TTL_SECONDS
  } = process.env;

  if (!BOOM_API_URL || !BOOM_USERNAME || !BOOM_PASSWORD) {
    return res.status(500).json({ error: 'Server misconfigured: missing BOOM_API_URL, BOOM_USERNAME or BOOM_PASSWORD' });
  }

  const filial = String(BOOM_FILIAL || BOOM_CNPJ || '').replace(/\D/g, '');
  const usuario = String(BOOM_USUARIO || BOOM_USERNAME).trim();

  if (!filial || !usuario) {
    return res.status(500).json({ error: 'Server misconfigured: missing BOOM_FILIAL/BOOM_USUARIO or BOOM_CNPJ' });
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

  if (cached && cached.expiresAt > now) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(cached.data);
  }

  try {
    const base = BOOM_API_URL.replace(/\/$/, '').replace('https://api.boomsistemas.com.br', 'https://boomsistemas.com.br');
    const url = `${base}/api/fullestoque/filial/${encodeURIComponent(filial)}/user/${encodeURIComponent(usuario)}` + (queryString ? `?${queryString}` : '');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Username: BOOM_USERNAME,
        Password: BOOM_PASSWORD,
        Accept: 'application/json'
      }
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = text; }

    if (!response.ok) {
      return res.status(502).json({ error: 'Boom API error', status: response.status, details: data });
    }

    const normalizeVehicleGallery = (vehicle) => {
      if (!vehicle || typeof vehicle !== 'object') return vehicle;
      const gallery = Array.isArray(vehicle.galeria) ? vehicle.galeria : [];
      const normalizedGallery = gallery.map((item) => {
        const relativeUrl = item && typeof item.veiculo_galeria_url === 'string' ? item.veiculo_galeria_url.trim() : '';
        const absoluteUrl = item && typeof item.url_imagem === 'string' ? item.url_imagem.trim() : '';
        return {
          ...item,
          veiculo_galeria_full_url: relativeUrl ? `https://arquivos.boomsistemas.com.br/veiculos/${relativeUrl}` : null,
          url_imagem_absoluta: absoluteUrl || null
        };
      });
      const firstImage = normalizedGallery.find((item) => item.url_imagem_absoluta || item.veiculo_galeria_full_url)?.url_imagem_absoluta || normalizedGallery.find((item) => item.url_imagem_absoluta || item.veiculo_galeria_full_url)?.veiculo_galeria_full_url || null;
      return {
        ...vehicle,
        galeria: normalizedGallery,
        fotoUrl: vehicle?.fotoUrl || firstImage,
        fotosUrls: normalizedGallery
          .map((item) => item.url_imagem_absoluta || item.veiculo_galeria_full_url)
          .filter(Boolean)
      };
    };

    let normalized = data;
    if (Array.isArray(data)) {
      normalized = data.map(normalizeVehicleGallery);
    } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
      normalized = { ...data, data: data.data.map(normalizeVehicleGallery) };
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
