const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');

const app = express();
// Runtime configuration centralized here so local dev and hosting use the same code path.
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const uploadsDir = path.join(dataDir, 'uploads', 'posts');
const frontendDir = path.join(__dirname, 'frontend');
const defaultSessionSecret = 'constherme-secret-CHANGE_THIS';
const sessionSecret = process.env.SESSION_SECRET || defaultSessionSecret;
const defaultAdminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || (!isProduction ? 'admin' : null);
const boomCache = { data: null, expiresAt: 0 };

if (isProduction && sessionSecret === defaultSessionSecret) {
  throw new Error('SESSION_SECRET must be configured in production');
}

if (isProduction) {
  app.set('trust proxy', 1);
}

// Ensure data directories exist before any SQLite store or DB is initialised.
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Public site files remain inside frontend/, while dynamic uploads are served from /uploads.
app.use(express.static(frontendDir));
app.use('/uploads', express.static(path.join(dataDir, 'uploads')));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));

// Keep admin sessions in SQLite so login survives restarts in production.
app.use(session({
  secret: sessionSecret,
  name: 'constherme.sid',
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: dataDir
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    secure: process.env.SESSION_SECURE_COOKIE === 'true' || isProduction
  }
}));

// Runtime data lives outside the tracked frontend folder to make deploy persistence easier.
// (directories are created early, before SQLite stores are initialised)

// Blog images are stored in the persistent uploads directory.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.random().toString(36).substring(2, 8) + ext;
    cb(null, name);
  }
});
const upload = multer({ storage });

// Main application database for admin users, blog posts and lookup tables.
const dbFile = path.join(dataDir, 'blog.db');
const db = new sqlite3.Database(dbFile);

function resolveStoredFilePath(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith('uploads/')) {
    return path.join(dataDir, imagePath.replace(/^uploads[\\/]/, 'uploads' + path.sep));
  }
  return path.join(frontendDir, imagePath);
}

db.serialize(() => {
  // Core tables are created lazily so a fresh deploy can boot without a manual migration step.
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    excerpt TEXT,
    content TEXT,
    theme TEXT,
    category TEXT,
    tags TEXT,
    slug TEXT,
    image_path TEXT,
    created_at TEXT,
    updated_at TEXT
  )`);

  // Ensure slug column exists for older DBs (no-op if already present)
  db.all("PRAGMA table_info(posts)", (err, cols) => {
    if (err) return console.error(err);
    const hasSlug = cols && cols.some(c => c.name === 'slug');
    if (!hasSlug) {
      db.run("ALTER TABLE posts ADD COLUMN slug TEXT", err2 => {
        if (err2) console.error('Erro adicionando coluna slug', err2);
      });
    }
  });

  // In production the initial admin credentials must come from environment variables.
  db.get(`SELECT * FROM users WHERE username = ?`, [defaultAdminUsername], async (err, row) => {
    if (err) return console.error(err);
    const legacyHash = '$2b$10$r5p7sI05lttVNafIgeUwweSOlEGRQBnxU7SE8jg8o70iW6xbd1sIO';
    const defaultHash = defaultAdminPassword ? await bcrypt.hash(defaultAdminPassword, 10).catch(() => null) : null;

    if (!row && defaultHash) {
      db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [defaultAdminUsername, defaultHash]);
      console.log(`Usuário administrativo criado: ${defaultAdminUsername}`);
      return;
    }

    if (row && row.password_hash === legacyHash && defaultHash && defaultAdminUsername === 'admin') {
      db.run(`UPDATE users SET password_hash = ? WHERE username = ?`, [defaultHash, defaultAdminUsername], (updateErr) => {
        if (updateErr) return console.error('Erro ao atualizar senha administrativa padrão', updateErr);
        console.log(`Senha administrativa atualizada para o usuário ${defaultAdminUsername}`);
      });
    }
  });

  // Create themes and categories tables
  db.run(`CREATE TABLE IF NOT EXISTS themes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  )`);

  // Themes/categories are used by both the public blog filters and the admin editor.
  const defaultThemes = ['Dicas','Curiosidades','Mercado'];
  const defaultCategories = ['Manutencao','Tecnologia','Financas'];
  const insertTheme = db.prepare('INSERT OR IGNORE INTO themes (name) VALUES (?)');
  defaultThemes.forEach(t => insertTheme.run(t));
  insertTheme.finalize();
  const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
  defaultCategories.forEach(c => insertCategory.run(c));
  insertCategory.finalize();

  // Seed sample posts if there are none (use images already present in frontend/imagens/img_carros)
  db.get('SELECT COUNT(1) as c FROM posts', (err, r) => {
    if (err) return console.error(err);
    if (r && r.c === 0) {
      const now = new Date().toISOString();
      const samples = [
        {
          title: '5 Cuidados Essenciais com Carros Premium',
          excerpt: 'Dicas rápidas para manter seu carro premium sempre no auge.',
          content: '<p>Manutenção periódica, atenção aos fluidos e revisões especializadas...</p>',
          theme: 'Dicas',
          category: 'Manutencao',
          tags: 'premium,manutencao,cuidados',
          image_path: 'imagens/img_carros/porschemacan.webp'
        },
        {
          title: 'Como funciona a tração integral (AWD)? Entenda a Tecnologia',
          excerpt: 'Entenda os princípios da tração integral e suas aplicações.',
          content: '<p>A tração integral distribui a força entre eixos...</p>',
          theme: 'Curiosidades',
          category: 'Tecnologia',
          tags: 'awd,tecnologia,tracton',
          image_path: 'imagens/img_carros/bmwx4.webp'
        },
        {
          title: 'Por que comprar um seminovo com Laudo Cautelar?',
          excerpt: 'Vantagens de adquirir um seminovo com laudo cautelar.',
          content: '<p>O laudo fornece segurança ao comprador...</p>',
          theme: 'Mercado',
          category: 'Financas',
          tags: 'seminovo,laudo,seguranca',
          image_path: 'imagens/img_carros/volvov60.webp'
        }
      ];

      const slugify = (s) => s.toString().toLowerCase()
        .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const insert = db.prepare('INSERT INTO posts (title, excerpt, content, theme, category, tags, slug, image_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      samples.forEach(item => {
        const slug = slugify(item.title);
        insert.run(item.title, item.excerpt, item.content, item.theme, item.category, item.tags, slug, item.image_path, now, now);
      });
      insert.finalize();
      console.log('Postagens de exemplo inseridas com slugs.');
    }
  });

  // Generate slugs for existing posts lacking one
  db.all("SELECT id, title FROM posts WHERE slug IS NULL OR slug = ''", (err2, rows) => {
    if (err2) return console.error('Erro consultando posts para gerar slugs', err2);
    if (rows && rows.length) {
      const slugifyExisting = (s) => (s||'').toString().toLowerCase()
        .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      const update = db.prepare('UPDATE posts SET slug = ? WHERE id = ?');
      rows.forEach(r => {
        const slug = slugifyExisting(r.title || r.id);
        update.run(slug, r.id);
      });
      update.finalize();
      console.log('Slugs gerados para posts existentes:', rows.length);
    }
  });
});

// Auth helper
function requireAuth(req, res, next) {
  if (req.session && req.session.user && req.session.user.username) return next();
  res.status(401).json({ error: 'Não autorizado' });
}

// Health check used by the hosting platform and quick post-deploy smoke tests.
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    environment: process.env.NODE_ENV || 'development',
    dataDir,
    uptimeSeconds: Math.round(process.uptime())
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (err) return res.status(500).json({ error: 'Erro no banco' });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
    bcrypt.compare(password, user.password_hash).then(match => {
      if (!match) return res.status(401).json({ error: 'Credenciais inválidas' });
      req.session.user = { id: user.id, username: user.username };
      res.json({ ok: true, user: { id: user.id, username: user.username } });
    }).catch(() => res.status(500).json({ error: 'Erro ao comparar senhas' }));
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Erro ao finalizar sessão' });
    res.json({ ok: true });
  });
});

// Whoami - check current session
app.get('/api/whoami', (req, res) => {
  if (req.session && req.session.user) return res.json({ user: req.session.user });
  res.json({ user: null });
});

// Change password (requires current password)
app.post('/api/change-password', requireAuth, (req, res) => {
  const userId = req.session.user && req.session.user.id;
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Nova senha deve ter pelo menos 4 caracteres' });
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return res.status(500).json({ error: 'Usuário não encontrado' });
    // If currentPassword provided, verify it; if not provided, only allow if username is not admin? For safety require it
    if (!currentPassword) return res.status(400).json({ error: 'Senha atual é necessária' });
    bcrypt.compare(currentPassword, user.password_hash).then(match => {
      if (!match) return res.status(401).json({ error: 'Senha atual incorreta' });
      bcrypt.hash(newPassword, 10).then(hash => {
        db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId], function (err) {
          if (err) return res.status(500).json({ error: 'Erro ao atualizar senha' });
          res.json({ ok: true });
        });
      }).catch(() => res.status(500).json({ error: 'Erro ao hashear senha' }));
    }).catch(() => res.status(500).json({ error: 'Erro ao comparar senha' }));
  });
});

// Public blog endpoints.
app.get('/api/posts', (req, res) => {
  const { theme, category, q, limit } = req.query;
  let sql = 'SELECT id, slug, title, excerpt, theme, category, tags, image_path, created_at FROM posts';
  const where = [];
  const params = [];
  if (theme) { where.push('theme = ?'); params.push(theme); }
  if (category) { where.push('category = ?'); params.push(category); }
  if (q) { where.push('(title LIKE ? OR excerpt LIKE ? OR content LIKE ?)'); params.push('%' + q + '%', '%'+q+'%', '%'+q+'%'); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY created_at DESC';
  if (limit) sql += ' LIMIT ' + parseInt(limit, 10);

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar posts' });
    res.json(rows);
  });
});

// Lookup tables used by the blog editor.
app.get('/api/themes', (req, res) => {
  db.all('SELECT name FROM themes ORDER BY name COLLATE NOCASE', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro buscando temas' });
    res.json(rows.map(r => r.name));
  });
});
app.post('/api/themes', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  db.run('INSERT OR IGNORE INTO themes (name) VALUES (?)', [name], function(err) {
    if (err) return res.status(500).json({ error: 'Erro ao criar tema' });
    res.json({ ok: true, name });
  });
});
// Delete theme by name (prevent deletion if in use by posts)
app.delete('/api/themes/:name', requireAuth, (req, res) => {
  const name = req.params.name;
  db.get('SELECT COUNT(1) as c FROM posts WHERE theme = ?', [name], (err, row) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar uso do tema' });
    if (row && row.c > 0) return res.status(400).json({ error: 'Não é possível excluir: existem posts usando este tema' });
    db.run('DELETE FROM themes WHERE name = ?', [name], function(err2) {
      if (err2) return res.status(500).json({ error: 'Erro ao deletar tema' });
      res.json({ ok: true });
    });
  });
});

// Categories list and create
app.get('/api/categories', (req, res) => {
  db.all('SELECT name FROM categories ORDER BY name COLLATE NOCASE', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro buscando categorias' });
    res.json(rows.map(r => r.name));
  });
});
app.post('/api/categories', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [name], function(err) {
    if (err) return res.status(500).json({ error: 'Erro ao criar categoria' });
    res.json({ ok: true, name });
  });
});
// Delete category by name (prevent deletion if in use by posts)
app.delete('/api/categories/:name', requireAuth, (req, res) => {
  const name = req.params.name;
  db.get('SELECT COUNT(1) as c FROM posts WHERE category = ?', [name], (err, row) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar uso da categoria' });
    if (row && row.c > 0) return res.status(400).json({ error: 'Não é possível excluir: existem posts usando esta categoria' });
    db.run('DELETE FROM categories WHERE name = ?', [name], function(err2) {
      if (err2) return res.status(500).json({ error: 'Erro ao deletar categoria' });
      res.json({ ok: true });
    });
  });
});

app.get('/api/posts/:id', (req, res) => {
  db.get('SELECT * FROM posts WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Erro no banco' });
    if (!row) return res.status(404).json({ error: 'Post não encontrado' });
    res.json(row);
  });
});

// Get post by slug
app.get('/api/posts/slug/:slug', (req, res) => {
  db.get('SELECT * FROM posts WHERE slug = ?', [req.params.slug], (err, row) => {
    if (err) return res.status(500).json({ error: 'Erro no banco' });
    if (!row) return res.status(404).json({ error: 'Post não encontrado' });
    res.json(row);
  });
});

// Related posts by tags or category
app.get('/api/posts/:id/related', (req, res) => {
  db.get('SELECT id, tags, category FROM posts WHERE id = ?', [req.params.id], (err, base) => {
    if (err || !base) return res.status(500).json([]);
    const tags = (base.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    let sql = 'SELECT id, slug, title, excerpt, image_path FROM posts WHERE id != ? AND (';
    const params = [req.params.id];
    const clauses = [];
    if (tags.length) {
      tags.forEach(tag => {
        clauses.push('tags LIKE ?');
        params.push('%' + tag + '%');
      });
    }
    clauses.push('category = ?');
    params.push(base.category || '');
    sql += clauses.join(' OR ') + ') LIMIT 4';
    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json([]);
      res.json(rows);
    });
  });
});

// Proxies the Boom stock feed so credentials stay only on the server.
app.get('/api/boom-stock', async (req, res) => {
  const {
    BOOM_API_URL,
    BOOM_USERNAME,
    BOOM_PASSWORD,
    FILIAL,
    USUARIO,
    CACHE_TTL_SECONDS
  } = process.env;

  if (!BOOM_API_URL || !BOOM_USERNAME || !BOOM_PASSWORD || !FILIAL || !USUARIO) {
    return res.status(503).json({ error: 'Integração Boom não configurada no servidor' });
  }

  const ttlSeconds = Math.max(0, parseInt(CACHE_TTL_SECONDS || '60', 10));
  const now = Date.now();

  if (boomCache.data && boomCache.expiresAt > now) {
    return res.json(boomCache.data);
  }

  try {
    const base = BOOM_API_URL.replace(/\/$/, '');
    const url = `${base}/api/fullestoque/filial/${FILIAL}/user/${USUARIO}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Username: BOOM_USERNAME,
        Password: BOOM_PASSWORD,
        Accept: 'application/json'
      }
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (parseError) {
      data = raw;
    }

    if (!response.ok) {
      return res.status(502).json({ error: 'Erro retornado pela API Boom', status: response.status, details: data });
    }

    boomCache.data = data;
    boomCache.expiresAt = now + ttlSeconds * 1000;
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Falha ao buscar estoque da Boom', message: error.message });
  }
});

// Admin blog CRUD.
app.post('/api/posts', requireAuth, upload.single('image'), (req, res) => {
  const { title, excerpt, content, theme, category, tags } = req.body;
  const image_path = req.file ? path.join('uploads', 'posts', req.file.filename).replace(/\\/g, '/') : null;
  const now = new Date().toISOString();

  // ensure theme/category exist in their tables (only when provided)
  if (theme) db.run('INSERT OR IGNORE INTO themes (name) VALUES (?)', [theme]);
  if (category) db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [category]);

  const slugify = (s) => (s||'').toString().toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const slug = slugify(title || now);

  db.run(`INSERT INTO posts (title, excerpt, content, theme, category, tags, slug, image_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, excerpt, content, theme, category, tags, slug, image_path, now, now], function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao salvar post' });
      db.get('SELECT id, slug, title, excerpt, theme, category, tags, image_path, created_at FROM posts WHERE id = ?', [this.lastID], (err, row) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar post salvo' });
        res.json(row);
      });
    });
});

// Update post
app.put('/api/posts/:id', requireAuth, upload.single('image'), (req, res) => {
  const { title, excerpt, content, theme, category, tags } = req.body;
  const id = req.params.id;
  const now = new Date().toISOString();
  const image_path = req.file ? path.join('uploads', 'posts', req.file.filename).replace(/\\/g, '/') : null;

  // ensure theme/category exist in their tables (only when provided)
  if (theme) db.run('INSERT OR IGNORE INTO themes (name) VALUES (?)', [theme]);
  if (category) db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [category]);

  const slugify = (s) => (s||'').toString().toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const slug = slugify(title || id);

  db.get('SELECT image_path FROM posts WHERE id = ?', [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Post não encontrado' });
    let sql, params;
    if (image_path) {
      sql = 'UPDATE posts SET title = ?, excerpt = ?, content = ?, theme = ?, category = ?, tags = ?, slug = ?, image_path = ?, updated_at = ? WHERE id = ?';
      params = [title, excerpt, content, theme, category, tags, slug, image_path, now, id];
    } else {
      sql = 'UPDATE posts SET title = ?, excerpt = ?, content = ?, theme = ?, category = ?, tags = ?, slug = ?, updated_at = ? WHERE id = ?';
      params = [title, excerpt, content, theme, category, tags, slug, now, id];
    }
    db.run(sql, params, function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao atualizar post' });
      db.get('SELECT id, slug, title, excerpt, theme, category, tags, image_path, created_at FROM posts WHERE id = ?', [id], (err, row2) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar post atualizado' });
        res.json(row2);
      });
    });
  });
});

// Delete post
app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  db.get('SELECT image_path FROM posts WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Erro' });
    db.run('DELETE FROM posts WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao deletar' });
      // Optionally delete image file
      if (row && row.image_path) {
        const file = resolveStoredFilePath(row.image_path);
        fs.unlink(file, () => {});
      }
      res.json({ ok: true });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
