// Public blog page loader: fetches posts from the backend and binds the public filters.
async function loadBlogPosts() {
  const container = document.querySelector('.layout-blog-lista');
  if (!container) return;
  // Indicar carregamento e remover conteúdo estático imediatamente para evitar confusão
  container.innerHTML = '<p style="padding:16px">Carregando postagens do servidor...</p>';

  try {
    const tema = document.getElementById('filtro-tema') ? document.getElementById('filtro-tema').value : '';
    const categoria = document.getElementById('filtro-categoria') ? document.getElementById('filtro-categoria').value : '';
    const params = new URLSearchParams();
    params.set('limit', '12');
    if (tema) params.set('theme', tema);
    if (categoria) params.set('category', categoria);

    const res = await fetch('/api/posts?' + params.toString());
    if (!res.ok) throw new Error('Resposta inválida do servidor');
    const posts = await res.json();
    container.innerHTML = '';
    if (!posts || posts.length === 0) {
      container.innerHTML = '<p style="padding:16px">Nenhuma postagem encontrada.</p>';
      return;
    }

    posts.forEach(p => {
      const a = document.createElement('a');
      a.className = 'card-blog-horizontal post-blog';
      a.style.textDecoration = 'none';
      a.dataset.tema = p.theme || '';
      a.dataset.categoria = p.category || '';
      a.dataset.data = (p.created_at || '').slice(0,10);

      const imgContainer = document.createElement('div');
      imgContainer.className = 'img-container';
      const tagsCont = document.createElement('div');
      tagsCont.className = 'tags-container';
      if (p.theme) tagsCont.innerHTML = `<span class="badge-destaque">${escapeHtml(p.theme)}</span>`;
      imgContainer.appendChild(tagsCont);
      if (p.image_path) imgContainer.innerHTML += `<img src="${p.image_path}" alt="${escapeHtml(p.title)}">`;

      const contentBar = document.createElement('div');
      contentBar.className = 'content-bar';
      contentBar.innerHTML = `<span class="data-postagem">${(p.created_at||'').slice(0,10)}</span>
        <h3>${escapeHtml(p.title)}</h3>
        <span class="leia-mais">LEIA MAIS <i class="fas fa-chevron-right" style="font-size: 0.7rem; margin-left: 5px;"></i></span>`;

      a.appendChild(imgContainer);
      a.appendChild(contentBar);

      // navegar para página dedicada de post
      a.href = `post.html?slug=${encodeURIComponent(p.slug||p.id)}`;

      container.appendChild(a);
    });
  } catch (err) {
    console.error('Erro ao carregar posts', err);
    container.innerHTML = '<p style="padding:16px;color:#b00">Não foi possível carregar posts do servidor. Se estiver usando o Live Server do VS Code, certifique-se de iniciar o backend (npm start) e abrir http://localhost:3000/blog.html</p>';
  }
}

async function loadFilters() {
  try {
    const t = await fetch('/api/themes');
    const themes = t.ok ? await t.json() : [];
    const temaSel = document.getElementById('filtro-tema');
    if (temaSel) {
      temaSel.innerHTML = '<option value="">Todos os Temas</option>';
      themes.forEach(name => { const o = document.createElement('option'); o.value = name; o.text = name; temaSel.add(o); });
      temaSel.addEventListener('change', loadBlogPosts);
    }

    const c = await fetch('/api/categories');
    const cats = c.ok ? await c.json() : [];
    const catSel = document.getElementById('filtro-categoria');
    if (catSel) {
      catSel.innerHTML = '<option value="">Todas as Categorias</option>';
      cats.forEach(name => { const o = document.createElement('option'); o.value = name; o.text = name; catSel.add(o); });
      catSel.addEventListener('change', loadBlogPosts);
    }
  } catch (err) { console.error('Erro carregando filtros', err); }
}

function escapeHtml(s){ if(!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Legacy modal preview helper kept for quick diagnostics, while the main flow uses post.html.
async function openPost(id) {
  try {
    const res = await fetch('/api/posts/' + id);
    if (!res.ok) return alert('Erro ao carregar post');
    const p = await res.json();
    // cria modal simples
    const modal = document.createElement('div');
    modal.style.position = 'fixed'; modal.style.left='0'; modal.style.top='0'; modal.style.right='0'; modal.style.bottom='0';
    modal.style.background='rgba(0,0,0,0.6)'; modal.style.display='flex'; modal.style.alignItems='center'; modal.style.justifyContent='center';
    modal.innerHTML = `
      <div style="background:#fff;max-width:900px;width:95%;max-height:90vh;overflow:auto;padding:20px;border-radius:8px;">
        <button id="close-modal" style="float:right">Fechar</button>
        <h2>${p.title}</h2>
        <p><small>${(p.created_at||'').slice(0,10)} • ${p.category || ''}</small></p>
        ${p.image_path ? `<img src="${p.image_path}" style="width:100%;max-height:300px;object-fit:cover;border-radius:6px;margin-bottom:12px">` : ''}
        <div>${p.content || ''}</div>
        <hr>
        <div id="related-posts" style="display:flex;gap:12px;flex-wrap:wrap"></div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#close-modal').addEventListener('click', () => modal.remove());

    // load related
    const rel = await fetch('/api/posts/' + id + '/related');
    if (rel.ok) {
      const related = await rel.json();
      const container = modal.querySelector('#related-posts');
      related.forEach(r => {
        const card = document.createElement('div');
        card.style.width='200px'; card.style.border='1px solid #ddd'; card.style.borderRadius='6px'; card.style.overflow='hidden';
        card.innerHTML = `${r.image_path ? `<img src="${r.image_path}" style="width:100%;height:100px;object-fit:cover">` : ''}
          <div style="padding:8px"><strong>${escapeHtml(r.title)}</strong><p style="font-size:0.9rem">${escapeHtml(r.excerpt||'')}</p></div>`;
        container.appendChild(card);
      });
    }
  } catch (err) { console.error(err); alert('Erro ao abrir post'); }
}

// Boot order: load lookup filters first, then request the matching posts.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { loadFilters().then(loadBlogPosts); });
} else { loadFilters().then(loadBlogPosts); }
