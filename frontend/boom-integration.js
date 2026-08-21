async function integration(payload, env) {
  const { BOOM_API_URL, BOOM_API_KEY } = env;

  if (!BOOM_API_URL || !BOOM_API_KEY) {
    throw new Error('Missing BOOM_API_URL or BOOM_API_KEY');
  }

  const response = await fetch(`${BOOM_API_URL.replace(/\/$/, '')}/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BOOM_API_KEY}`
    },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      phone: payload.phone || '',
      message: payload.message || ''
    })
  });

  const raw = await response.text();
  let data;

  try {
    data = JSON.parse(raw);
  } catch (error) {
    data = raw;
  }

  if (!response.ok) {
    const integrationError = new Error('Boom API error');
    integrationError.status = response.status;
    integrationError.details = data;
    throw integrationError;
  }

  return data;
}

module.exports = { integration };
