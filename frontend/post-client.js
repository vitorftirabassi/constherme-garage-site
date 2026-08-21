function qs(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  const results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function escapeHtml(s){ if(!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function loadPost() {
  const id = qs('id');
  const slug = qs('slug');
  if (!id && !slug) {
    document.getElementById('post-title').textContent = 'Post não especificado';
    return;
  }
  try {
    const fetchUrl = slug ? ('/api/posts/slug/' + encodeURIComponent(slug)) : ('/api/posts/' + id);
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error('Post não encontrado');
    const p = await res.json();

    document.getElementById('post-title').textContent = p.title || '';
    document.getElementById('post-meta').textContent = `${(p.created_at||'').slice(0,10)} • ${p.category||''}`;

    const imgDiv = document.getElementById('post-image');
    imgDiv.innerHTML = '';
    if (p.image_path) imgDiv.innerHTML = `<img src="${p.image_path}" style="width:100%;max-height:420px;object-fit:cover;border-radius:6px">`;

    document.getElementById('post-content').innerHTML = p.content || '';

    // carregar relacionados
    const rel = await fetch('/api/posts/' + (p.id) + '/related');
    if (rel.ok) {
      const related = await rel.json();
      const container = document.getElementById('related-list');
      container.innerHTML = '';
      related.forEach(r => {
        const card = document.createElement('a');
        card.href = `post.html?slug=${encodeURIComponent(r.slug||r.id)}`;
        card.style.width='240px'; card.style.textDecoration='none'; card.style.color='inherit';
        card.innerHTML = `<div style="border:1px solid #eee;border-radius:6px;overflow:hidden;background:#fff">
          ${r.image_path ? `<img src="${r.image_path}" style="width:100%;height:120px;object-fit:cover">` : ''}
          <div style="padding:8px"><strong>${escapeHtml(r.title)}</strong><p style="font-size:0.9rem;color:#444">${escapeHtml(r.excerpt||'')}</p></div>
        </div>`;
        container.appendChild(card);
      });
    }
  } catch (err) {
    console.error(err);
    document.getElementById('post-title').textContent = 'Erro ao carregar post';
    document.getElementById('post-content').textContent = '';
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadPost); else loadPost();