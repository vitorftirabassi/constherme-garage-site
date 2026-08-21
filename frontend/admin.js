// Admin panel script: authentication gate, post CRUD, theme/category management and password change.
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

let isAuthed = false;
let pwWarningToastId = null; // stores warning toast id so it can be dismissed after pw change


async function checkAuth() {
  try {
    const r = await fetch('/api/whoami', { credentials: 'include' });
    const j = await r.json();
    isAuthed = !!(j && j.user);

    const adminArea = document.getElementById('admin-area');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout');
    const addThemeBtn = document.getElementById('add-theme');
    const addCategoryBtn = document.getElementById('add-category');
    const changePwArea = document.getElementById('change-password-area');
    const adminToggleBtn = document.getElementById('admin-toggle');
    const headerLogout = document.getElementById('header-logout');

    // The admin screen is progressively revealed only after the server confirms the session.
    if (isAuthed) {
      if (adminArea) adminArea.style.display = 'block';
      if (loginForm) loginForm.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (addThemeBtn) addThemeBtn.style.display = 'inline-block';
      if (addCategoryBtn) addCategoryBtn.style.display = 'inline-block';
      if (changePwArea) changePwArea.style.display = 'block';

      if (adminToggleBtn) {
        adminToggleBtn.style.display = 'inline-flex';
        adminToggleBtn.textContent = 'ADMINISTRADOR';
      }
      if (headerLogout) headerLogout.style.display = 'inline-flex';

      await fetchLists();
      loadPosts();

      const toggleBtn = document.getElementById('toggle-change-pw');
      const alreadyHidden = localStorage.getItem('pwChangedOnce') === '1';
      if (j && j.user && j.user.username === 'admin') {
        pwWarningToastId = showToast('Alerta: usuário padrão admin em uso. Altere a senha padrão imediatamente na seção "Alterar senha".', 'warning', 8000);
      }
      if (alreadyHidden) {
        if (changePwArea) changePwArea.style.display = 'none';
        if (toggleBtn) toggleBtn.style.display = 'inline-block';
      } else {
        if (changePwArea) changePwArea.style.display = 'block';
        if (toggleBtn) toggleBtn.style.display = 'none';
      }
    } else {
      const path = (window.location.pathname || '').toLowerCase();
      if (!path.endsWith('admin-login.html') && !path.endsWith('/admin/')) {
        window.location.href = 'admin-login.html';
        return;
      }
      if (adminArea) adminArea.style.display = 'none';
      if (loginForm) loginForm.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (addThemeBtn) addThemeBtn.style.display = 'none';
      if (addCategoryBtn) addCategoryBtn.style.display = 'none';
      if (changePwArea) changePwArea.style.display = 'none';
      const pwWarning = document.getElementById('pw-warning'); if (pwWarning) pwWarning.textContent = '';
      if (adminToggleBtn) adminToggleBtn.style.display = 'none';
      if (headerLogout) headerLogout.style.display = 'none';
    }
  } catch (err) {
    console.error('Erro verificando autenticação', err);
  }
}

async function login(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const msg = document.getElementById('login-msg');
  msg.textContent = '';
  try {
    const r = await postJSON('/api/login', { username, password });
    if (r.ok) {
      await checkAuth();
    } else {
      msg.textContent = r.error || 'Erro no login';
    }
  } catch (err) { msg.textContent = 'Erro de conexão'; }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST', credentials: 'include' });
  await checkAuth();
}

// The admin page self-protects on load and redirects visitors without a valid session.
checkAuth();


async function loadPosts() {
  const res = await fetch('/api/posts', { credentials: 'include' });
  const rows = await res.json();
  const container = document.getElementById('posts-list');
  container.innerHTML = '';
  rows.forEach(p => {
    const div = document.createElement('div');
    div.className = 'card-blog-horizontal';
    div.style.marginBottom = '12px';
    div.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center">
        <div style="width:120px;height:80px;overflow:hidden;border-radius:6px;flex:0 0 120px;">
          ${p.image_path ? `<img src="${p.image_path}" style="width:100%;height:100%;object-fit:cover">` : ''}
        </div>
        <div style="flex:1">
          <strong>${escapeHtml(p.title)}</strong><br>
          <small>${p.excerpt || ''}</small>
          <div style="font-size:0.85rem;color:#666">${p.theme ? 'Tema: ' + escapeHtml(p.theme) : ''} ${p.category ? ' • Categoria: ' + escapeHtml(p.category) : ''}</div>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <button data-id="${p.id}" class="btn-card edit">Editar</button>
          <button data-id="${p.id}" class="btn-outline del">Excluir</button>
        </div>
      </div>`;
    container.appendChild(div);
  });
  container.querySelectorAll('.edit').forEach(b => b.addEventListener('click', e => editPost(e.target.dataset.id)));
  container.querySelectorAll('.del').forEach(b => b.addEventListener('click', e => deletePost(e.target.dataset.id)));
}

function escapeHtml(s){ if(!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Lightweight inline notifications keep the admin UX responsive without extra dependencies.
function showToast(text, type = 'info', duration = 4000) {
  let container = document.getElementById('toasts-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toasts-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = 2000;
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = text;
  el.style.marginTop = '8px';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '8px';
  el.style.color = '#fff';
  el.style.minWidth = '180px';
  el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.5)';
  if (type === 'success') el.style.background = '#2ecc71';
  else if (type === 'error') el.style.background = '#e74c3c';
  else if (type === 'warning') el.style.background = '#f39c12';
  else el.style.background = '#333';

  container.appendChild(el);
  const id = Symbol();
  if (duration > 0) setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, duration);
  return id; // not used for now except sentinel
}
function dismissAllToasts() {
  const c = document.getElementById('toasts-container');
  if (c) c.remove();
}


async function editPost(id) {
  const res = await fetch('/api/posts/' + id, { credentials: 'include' });
  if (!res.ok) { showToast('Erro ao carregar post', 'error'); return; }
  const p = await res.json();
  document.getElementById('post-id').value = p.id;
  document.getElementById('post-title').value = p.title || '';
  document.getElementById('post-excerpt').value = p.excerpt || '';
  // set selects, add option if missing
  const themeSel = document.getElementById('post-theme');
  if (p.theme && !Array.from(themeSel.options).some(o => o.value === p.theme)) {
    const opt = document.createElement('option'); opt.value = p.theme; opt.text = p.theme; themeSel.add(opt);
  }
  themeSel.value = p.theme || '';
  const themeDisplay = document.getElementById('theme-display'); if (themeDisplay) themeDisplay.textContent = themeSel.value || '(selecionar tema)';
  const catSel = document.getElementById('post-category');
  if (p.category && !Array.from(catSel.options).some(o => o.value === p.category)) {
    const opt = document.createElement('option'); opt.value = p.category; opt.text = p.category; catSel.add(opt);
  }
  catSel.value = p.category || '';
  const categoryDisplay = document.getElementById('category-display'); if (categoryDisplay) categoryDisplay.textContent = catSel.value || '(selecionar categoria)';
  document.getElementById('post-tags').value = p.tags || '';
  document.getElementById('post-content').value = p.content || '';
}

async function deletePost(id) {
  if (!confirm('Deseja excluir este post?')) return;
  try {
    const res = await fetch('/api/posts/' + id, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      showToast('Post excluído', 'success');
      loadPosts();
    } else {
      showToast('Erro ao excluir', 'error');
    }
  } catch (err) {
    showToast('Erro de conexão ao excluir', 'error');
  }
}

async function savePost(e) {
  e.preventDefault();
  const id = document.getElementById('post-id').value;
  const title = document.getElementById('post-title').value;
  const excerpt = document.getElementById('post-excerpt').value;
  const theme = document.getElementById('post-theme').value;
  const category = document.getElementById('post-category').value;
  const tags = document.getElementById('post-tags').value;
  const content = document.getElementById('post-content').value;
  const file = document.getElementById('post-image').files[0];

  const form = new FormData();
  form.append('title', title);
  form.append('excerpt', excerpt);
  form.append('theme', theme);
  form.append('category', category);
  form.append('tags', tags);
  form.append('content', content);
  if (file) form.append('image', file);

  const url = id ? '/api/posts/' + id : '/api/posts';
  const method = id ? 'PUT' : 'POST';
  try {
    const res = await fetch(url, { method, body: form, credentials: 'include' });
    if (res.ok) {
      document.getElementById('post-form').reset();
      document.getElementById('post-id').value = '';
      await fetchLists();
      loadPosts();
      showToast('Post salvo', 'success');
    } else {
      const err = await res.json();
      showToast(err.error || 'Erro ao salvar', 'error');
    }
  } catch (err) {
    showToast('Erro de conexão ao salvar post', 'error');
  }
}

const _loginFormEl = document.getElementById('login-form'); if (_loginFormEl) _loginFormEl.addEventListener('submit', login);
const _logoutBtn = document.getElementById('logout'); if (_logoutBtn) _logoutBtn.addEventListener('click', logout);
const _headerLogoutBtn = document.getElementById('header-logout'); if (_headerLogoutBtn) _headerLogoutBtn.addEventListener('click', logout);
const _postForm = document.getElementById('post-form'); if (_postForm) _postForm.addEventListener('submit', savePost);
const _clearBtn = document.getElementById('clear-form'); if (_clearBtn) _clearBtn.addEventListener('click', () => { if (_postForm) _postForm.reset(); });

// Add new theme/category locally (only saved to DB when post is saved)
// Modal-driven add theme/category (no backend call yet; persisted when post is saved)
// Theme/category creation is handled by one shared modal to avoid duplicating UI flows.
let currentAddType = null; // 'theme' or 'category'
const itemModal = document.getElementById('item-modal');
const itemNameInput = document.getElementById('item-name');
const itemModalTitle = document.getElementById('item-modal-title');
const itemCancelBtn = document.getElementById('item-cancel');
const itemSaveBtn = document.getElementById('item-save');

function openAddModal(type) {
  currentAddType = type;
  itemNameInput.value = '';
  itemModalTitle.textContent = type === 'theme' ? 'Adicionar Tema' : 'Adicionar Categoria';
  itemModal.style.display = 'flex';
  setTimeout(() => itemNameInput.focus(), 50);
}
function closeAddModal() {
  currentAddType = null;
  itemModal.style.display = 'none';
}

document.getElementById('add-theme').addEventListener('click', () => openAddModal('theme'));
document.getElementById('add-category').addEventListener('click', () => openAddModal('category'));

itemCancelBtn.addEventListener('click', (e) => { e.preventDefault(); closeAddModal(); });
itemModal.addEventListener('click', (e) => { if (e.target === itemModal) closeAddModal(); });
itemSaveBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const name = (itemNameInput.value || '').trim();
  if (!name) { showToast('Informe um nome válido', 'error'); return; }
  if (currentAddType === 'theme') {
    const themeSel = document.getElementById('post-theme');
    if (!Array.from(themeSel.options).some(o => o.value === name)) {
      const opt = document.createElement('option'); opt.value = name; opt.text = name; opt.dataset.new = 'true'; themeSel.add(opt);
    }
    themeSel.value = name;
    renderManageThemes();
  } else if (currentAddType === 'category') {
    const catSel = document.getElementById('post-category');
    if (!Array.from(catSel.options).some(o => o.value === name)) {
      const opt = document.createElement('option'); opt.value = name; opt.text = name; opt.dataset.new = 'true'; catSel.add(opt);
    }
    catSel.value = name;
    renderManageCategories();
  }
  closeAddModal();
  showToast('Opção adicionada localmente. Salve o post para persistir.', 'success', 4000);
});

// handle enter key in modal
itemNameInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') itemSaveBtn.click(); });

async function fetchLists() {
  try {
    const t = await fetch('/api/themes');
    const themes = t.ok ? await t.json() : [];
    const themeSel = document.getElementById('post-theme');
    if (themeSel) {
      // preserve any locally-added new options
      const localNew = Array.from(themeSel.options).filter(o => o.dataset && o.dataset.new).map(o => o.value);
      themeSel.innerHTML = '<option value="">(selecionar tema)</option>';
      themes.forEach(name => { const o = document.createElement('option'); o.value = name; o.text = name; themeSel.add(o); });
      localNew.forEach(name => { if (!Array.from(themeSel.options).some(o => o.value === name)) { const o = document.createElement('option'); o.value = name; o.text = name; o.dataset.new = 'true'; themeSel.add(o); } });
      // update display
      const disp = document.getElementById('theme-display'); if (disp) { disp.textContent = themeSel.value || '(selecionar tema)'; }
    }

    const c = await fetch('/api/categories');
    const cats = c.ok ? await c.json() : [];
    const catSel = document.getElementById('post-category');
    if (catSel) {
      const localNewCat = Array.from(catSel.options).filter(o => o.dataset && o.dataset.new).map(o => o.value);
      catSel.innerHTML = '<option value="">(selecionar categoria)</option>';
      cats.forEach(name => { const o = document.createElement('option'); o.value = name; o.text = name; catSel.add(o); });
      localNewCat.forEach(name => { if (!Array.from(catSel.options).some(o => o.value === name)) { const o = document.createElement('option'); o.value = name; o.text = name; o.dataset.new = 'true'; catSel.add(o); } });
      const disp = document.getElementById('category-display'); if (disp) { disp.textContent = catSel.value || '(selecionar categoria)'; }
    }

    renderManageThemes();
    renderManageCategories();
  } catch (err) { console.error('Erro carregando listas', err); }
}

// Try to detect if already logged in by requesting posts (simple check)
fetch('/api/posts', { credentials: 'include' }).then(r => {
  if (r.status === 200) {
    // not guaranteed admin but we can allow viewing; admin-only features will fail if not authed
  }
}).catch(()=>{});

// Load themes/categories on page load for convenience
fetchLists();

// Custom dropdown rendering is used because native <select> cannot host the delete action reliably.
async function renderManageThemes() {
  const container = document.getElementById('manage-themes');
  const dropdown = document.getElementById('theme-dropdown');
  const themeSel = document.getElementById('post-theme');
  if (container) container.innerHTML = '';
  if (dropdown) dropdown.innerHTML = '';
  try {
    const res = await fetch('/api/themes', { credentials: 'include' });
    const themes = res.ok ? await res.json() : [];
    // include local new options as well
    const localNew = themeSel ? Array.from(themeSel.options).filter(o => o.dataset && o.dataset.new).map(o => o.value) : [];
    const all = [...themes, ...localNew.filter(n => !themes.includes(n))];

    // keep the (hidden) management area for backwards compatibility (but hidden by default)
    if (container) {
      all.forEach(name => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.marginBottom = '6px';
        const span = document.createElement('span'); span.textContent = name;
        const btn = document.createElement('button'); btn.className = 'btn-outline'; btn.textContent = 'Excluir'; btn.style.fontSize = '0.85rem';
        btn.addEventListener('click', async () => {
          if (!confirm('Excluir tema "' + name + '"?')) return;
          // if this is local-only, just remove from select
          const opt = Array.from(themeSel.options).find(o => o.value === name && o.dataset && o.dataset.new);
          if (opt) { opt.remove(); renderManageThemes(); showToast('Tema removido localmente', 'success'); return; }
          // call backend to delete
          const d = await fetch('/api/themes/' + encodeURIComponent(name), { method: 'DELETE', credentials: 'include' });
          if (d.ok) { showToast('Tema removido', 'success'); fetchLists(); } else { showToast('Erro ao remover tema', 'error'); }
        });
        row.appendChild(span); row.appendChild(btn); container.appendChild(row);
      });
    }

    // populate dropdown (appears when user opens the filter)
    if (dropdown) {
      all.forEach(name => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.padding = '6px 8px';
        row.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
        row.style.cursor = 'pointer';
        const txt = document.createElement('span'); txt.textContent = name; txt.style.flex = '1';
        const del = document.createElement('i'); del.className = 'fas fa-trash'; del.style.color = '#e74c3c'; del.style.marginLeft = '8px'; del.title = 'Excluir';

        // click on name: set selection
        txt.addEventListener('click', () => {
          if (themeSel) { themeSel.value = name; }
          const disp = document.getElementById('theme-display'); if (disp) disp.textContent = name;
          dropdown.style.display = 'none';
        });
        // click on trash: delete
        del.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          if (!confirm('Excluir tema "' + name + '"?')) return;
          const opt = Array.from(themeSel.options).find(o => o.value === name && o.dataset && o.dataset.new);
          if (opt) { opt.remove(); renderManageThemes(); showToast('Tema removido localmente', 'success'); return; }
          const d = await fetch('/api/themes/' + encodeURIComponent(name), { method: 'DELETE', credentials: 'include' });
          if (d.ok) { showToast('Tema removido', 'success'); fetchLists(); } else { showToast('Erro ao remover tema', 'error'); }
        });

        row.appendChild(txt); row.appendChild(del); dropdown.appendChild(row);
      });
    }
  } catch (err) { console.error(err); }
}

async function renderManageCategories() {
  const container = document.getElementById('manage-categories');
  const dropdown = document.getElementById('category-dropdown');
  const catSel = document.getElementById('post-category');
  if (container) container.innerHTML = '';
  if (dropdown) dropdown.innerHTML = '';
  try {
    const res = await fetch('/api/categories', { credentials: 'include' });
    const cats = res.ok ? await res.json() : [];
    const localNew = catSel ? Array.from(catSel.options).filter(o => o.dataset && o.dataset.new).map(o => o.value) : [];
    const all = [...cats, ...localNew.filter(n => !cats.includes(n))];

    if (container) {
      all.forEach(name => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.marginBottom = '6px';
        const span = document.createElement('span'); span.textContent = name;
        const btn = document.createElement('button'); btn.className = 'btn-outline'; btn.textContent = 'Excluir'; btn.style.fontSize = '0.85rem';
        btn.addEventListener('click', async () => {
          if (!confirm('Excluir categoria "' + name + '"?')) return;
          const opt = Array.from(catSel.options).find(o => o.value === name && o.dataset && o.dataset.new);
          if (opt) { opt.remove(); renderManageCategories(); showToast('Categoria removida localmente', 'success'); return; }
          const d = await fetch('/api/categories/' + encodeURIComponent(name), { method: 'DELETE', credentials: 'include' });
          if (d.ok) { showToast('Categoria removida', 'success'); fetchLists(); } else { showToast('Erro ao remover categoria', 'error'); }
        });
        row.appendChild(span); row.appendChild(btn); container.appendChild(row);
      });
    }

    if (dropdown) {
      all.forEach(name => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.padding = '6px 8px';
        row.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
        row.style.cursor = 'pointer';
        const txt = document.createElement('span'); txt.textContent = name; txt.style.flex = '1';
        const del = document.createElement('i'); del.className = 'fas fa-trash'; del.style.color = '#e74c3c'; del.style.marginLeft = '8px'; del.title = 'Excluir';

        txt.addEventListener('click', () => {
          if (catSel) { catSel.value = name; }
          const disp = document.getElementById('category-display'); if (disp) disp.textContent = name;
          dropdown.style.display = 'none';
        });
        del.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          if (!confirm('Excluir categoria "' + name + '"?')) return;
          const opt = Array.from(catSel.options).find(o => o.value === name && o.dataset && o.dataset.new);
          if (opt) { opt.remove(); renderManageCategories(); showToast('Categoria removida localmente', 'success'); return; }
          const d = await fetch('/api/categories/' + encodeURIComponent(name), { method: 'DELETE', credentials: 'include' });
          if (d.ok) { showToast('Categoria removida', 'success'); fetchLists(); } else { showToast('Erro ao remover categoria', 'error'); }
        });

        row.appendChild(txt); row.appendChild(del); dropdown.appendChild(row);
      });
    }
  } catch (err) { console.error(err); }
}

// Change password form handler
const changePwForm = document.getElementById('change-password-form');
if (changePwForm) {
  changePwForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cur = document.getElementById('current-password').value;
    const npw = document.getElementById('new-password').value;
    const conf = document.getElementById('confirm-new-password').value;
    if (!npw || npw.length < 4) return showToast('Nova senha muito curta (mín 4 caracteres)', 'error');
    if (npw !== conf) return showToast('Confirmação não confere', 'error');
    try {
      const r = await fetch('/api/change-password', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: cur, newPassword: npw }) });
      const j = await r.json();
      if (r.ok) {
        showToast('Senha atualizada com sucesso', 'success');
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-new-password').value = '';
        // hide change password area after first successful change
        localStorage.setItem('pwChangedOnce', '1');
        const changePwArea = document.getElementById('change-password-area');
        const toggleBtn = document.getElementById('toggle-change-pw');
        if (changePwArea) changePwArea.style.display = 'none';
        if (toggleBtn) toggleBtn.style.display = 'inline-block';
        // dismiss previous warning toasts
        dismissAllToasts();
      } else {
        showToast(j.error || 'Erro ao alterar senha', 'error');
      }
    } catch (err) {
      showToast('Erro de conexão', 'error');
    }
  });
}

// toggle button to show/hide change password
const toggleBtn = document.getElementById('toggle-change-pw');
if (toggleBtn) toggleBtn.addEventListener('click', () => {
  const changePwArea = document.getElementById('change-password-area');
  if (!changePwArea) return;
  changePwArea.style.display = changePwArea.style.display === 'block' ? 'none' : 'block';
});


// Dropdown toggle behaviour for theme/category filters
function positionDropdown(selectEl, dropdownEl) {
  const rect = selectEl.getBoundingClientRect();
  dropdownEl.style.minWidth = rect.width + 'px';
  dropdownEl.style.left = '0';
  dropdownEl.style.top = 'calc(100% + 6px)';
}

function wireFilterDropdowns() {
  const themeSel = document.getElementById('post-theme');
  const catSel = document.getElementById('post-category');
  const themeDisplay = document.getElementById('theme-display');
  const categoryDisplay = document.getElementById('category-display');
  const themeDropdown = document.getElementById('theme-dropdown');
  const catDropdown = document.getElementById('category-dropdown');

  if (window.__adminFilterDropdownsBound) return;
  window.__adminFilterDropdownsBound = true;

  if (themeDisplay && themeDropdown) {
    themeDisplay.addEventListener('click', (e) => {
      e.stopPropagation();
      if (themeDropdown.style.display === 'block') { themeDropdown.style.display = 'none'; return; }
      renderManageThemes();
      themeDropdown.style.display = 'block';
      positionDropdown(themeDisplay, themeDropdown);
      if (catDropdown) catDropdown.style.display = 'none';
    });
  }
  if (categoryDisplay && catDropdown) {
    categoryDisplay.addEventListener('click', (e) => {
      e.stopPropagation();
      if (catDropdown.style.display === 'block') { catDropdown.style.display = 'none'; return; }
      renderManageCategories();
      catDropdown.style.display = 'block';
      positionDropdown(categoryDisplay, catDropdown);
      if (themeDropdown) themeDropdown.style.display = 'none';
    });
  }

  document.addEventListener('click', (event) => {
    const clickedInsideTheme = themeDisplay && themeDisplay.contains(event.target);
    const clickedInsideCategory = categoryDisplay && categoryDisplay.contains(event.target);
    const clickedInsideThemeDrop = themeDropdown && themeDropdown.contains(event.target);
    const clickedInsideCategoryDrop = catDropdown && catDropdown.contains(event.target);
    if (!clickedInsideTheme && !clickedInsideThemeDrop) {
      if (themeDropdown) themeDropdown.style.display = 'none';
    }
    if (!clickedInsideCategory && !clickedInsideCategoryDrop) {
      if (catDropdown) catDropdown.style.display = 'none';
    }
  });

  window.addEventListener('resize', () => {
    if (themeDropdown && themeDropdown.style.display === 'block' && themeDisplay) positionDropdown(themeDisplay, themeDropdown);
    if (catDropdown && catDropdown.style.display === 'block' && categoryDisplay) positionDropdown(categoryDisplay, catDropdown);
  });
  window.addEventListener('scroll', () => {
    if (themeDropdown && themeDropdown.style.display === 'block' && themeDisplay) positionDropdown(themeDisplay, themeDropdown);
    if (catDropdown && catDropdown.style.display === 'block' && categoryDisplay) positionDropdown(categoryDisplay, catDropdown);
  });
}

setTimeout(wireFilterDropdowns, 100);
