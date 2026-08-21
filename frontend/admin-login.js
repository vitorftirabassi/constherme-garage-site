async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

const loginForm = document.getElementById('login-form');
const loginMsg = document.getElementById('login-msg');
const loadingOverlay = document.getElementById('loading-overlay');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginMsg.textContent = '';
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
      const r = await postJSON('/api/login', { username, password });
      if (r.ok) {
        // show loading overlay while admin area initializes
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        // small delay to allow UX of loading screen
        setTimeout(() => { window.location.href = 'admin.html'; }, 800);
      } else {
        loginMsg.textContent = r.error || 'Erro no login';
      }
    } catch (err) {
      loginMsg.textContent = 'Erro de conexão';
    }
  });
}
