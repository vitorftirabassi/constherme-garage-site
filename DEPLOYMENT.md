Deploy recomendado para a Constherme Garage

Resumo
- Plataforma recomendada: Render.
- Motivo: o projeto usa Express, SQLite, upload de imagens e sessão de login, então precisa de hospedagem Node com disco persistente.
- Arquivo de apoio já incluído: `render.yaml`.

Por que não priorizar Vercel/Netlify neste projeto
- O painel admin grava dados no SQLite.
- As imagens dos posts precisam persistir.
- O login usa sessão no servidor.
- Isso combina melhor com uma hospedagem stateful do que com serverless puro.

O que já foi preparado no projeto
- `PORT` via variável de ambiente.
- `SESSION_SECRET` via variável de ambiente.
- `DATA_DIR` para armazenar banco e uploads em disco persistente.
- Health check em `/api/health`.
- Endpoint `/api/boom-stock` no próprio Express.
- Uploads de posts gravados em `uploads/posts/...` servidos pelo backend.
- `.env.example` com as variáveis necessárias.
- `.gitignore` para evitar subir arquivos locais e sensíveis.

Arquivos importantes
- `server.js`
- `package.json`
- `.env.example`
- `render.yaml`

Variáveis de ambiente necessárias
- `NODE_ENV=production`
- `DATA_DIR=/var/data`
- `SESSION_SECRET=<valor forte>`
- `SESSION_SECURE_COOKIE=true`
- `CACHE_TTL_SECONDS=60`
- `DEFAULT_ADMIN_USERNAME=admin`
- `DEFAULT_ADMIN_PASSWORD=<senha inicial forte>`

Integração Boom
- `BOOM_API_URL` (use `https://boomsistemas.com.br`)
- `BOOM_USERNAME` (usuário HTTP exigido pela API)
- `BOOM_PASSWORD` (senha HTTP exigida pela API)
- `BOOM_FILIAL` (código da filial que o suporte da Boom informa)
- `BOOM_USUARIO` (opcional; normalmente igual ao `BOOM_USERNAME`)
- `BOOM_CNPJ` (mantido apenas para compatibilidade com integrações antigas; não é o fluxo principal atual)

Fluxo atual da Boom
- O endpoint correto do estoque é: `GET https://boomsistemas.com.br/api/fullestoque/filial/{CODIGO_FILIAL}/user/{CODIGO_USUARIO}`
- A autenticação é por headers HTTP `Username` e `Password`
- Não existe OAuth nem `client_id/client_secret` no fluxo de estoque completo
- Se o retorno vier vazio, os veículos provavelmente não estão habilitados na aba de integração/site do sistema da Boom

Como publicar no Render
1. Suba o projeto para um repositório GitHub.
2. Crie uma conta em https://render.com.
3. Escolha New + Web Service.
4. Conecte o repositório.
5. O Render pode ler o `render.yaml` automaticamente.
6. Confirme a criação do disco persistente em `/var/data`.
7. Preencha as variáveis da Boom se quiser usar o estoque dinâmico.
8. Faça o primeiro deploy.

Após o deploy
- Teste `https://seu-dominio/api/health`
- Teste `https://seu-dominio/admin-login.html`
- Teste login, criação de post e upload de imagem.
- Confirme se as imagens novas abrem por URL em `/uploads/posts/...`

Domínio
- Depois que o deploy estiver funcionando, conecte o domínio personalizado no painel do Render.
- O SSL é emitido automaticamente pela plataforma.

Observações importantes
- Se você continuar usando SQLite, mantenha o disco persistente ativo.
- Se no futuro o volume crescer bastante, o ideal é migrar para PostgreSQL.
- Em produção, configure `SESSION_SECRET` e `DEFAULT_ADMIN_PASSWORD` antes do primeiro deploy.
- Após publicar, entre em [admin-login.html](C:/Users/Vitor/OneDrive/Área de Trabalho/site_constherme/frontend/admin-login.html) e troque a senha inicial do administrador.
