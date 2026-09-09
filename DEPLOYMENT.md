Deploy recomendado para a Constherme Garage

Resumo
- Plataforma recomendada: Fly.io.
- Motivo: o projeto usa Express, SQLite, upload de imagens e sessão de login, então precisa de hospedagem Node com disco persistente de verdade. O Fly.io foi desenhado justamente para esse tipo de aplicação (SQLite + volume persistente é um caso de uso oficial da plataforma).
- Arquivo de apoio já incluído: `fly.toml`.

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
- `fly.toml`

Variáveis de ambiente necessárias
- `NODE_ENV=production`
- `DATA_DIR=/data`
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

Como publicar no Fly.io
1. Suba o projeto para um repositório GitHub (se ainda não estiver).
2. Crie uma conta em https://fly.io.
3. Instale o `flyctl` (CLI oficial do Fly.io) na máquina de onde você vai publicar.
4. Faça login: `fly auth login`.
5. Na pasta do projeto, rode `fly launch` (ele detecta o `fly.toml` já incluso; quando perguntar sobre criar banco de dados Postgres/Redis, escolha "Não", pois o projeto usa SQLite em disco).
6. Crie o volume persistente (só na primeira vez): `fly volumes create constherme_data --region gru --size 1`.
7. Configure as variáveis de ambiente sensíveis como "secrets" (não ficam no `fly.toml`, então não vazam no Git):
   - `fly secrets set SESSION_SECRET=<valor forte>`
   - `fly secrets set DEFAULT_ADMIN_USERNAME=admin`
   - `fly secrets set DEFAULT_ADMIN_PASSWORD=<senha inicial forte>`
   - `fly secrets set BOOM_API_URL=https://boomsistemas.com.br`
   - `fly secrets set BOOM_USERNAME=<usuário Boom>`
   - `fly secrets set BOOM_PASSWORD=<senha Boom>`
   - `fly secrets set BOOM_FILIAL=<código da filial>`
   - `fly secrets set BOOM_USUARIO=<código do usuário>`
8. Faça o deploy: `fly deploy`.

Após o deploy
- Teste `https://seu-app.fly.dev/api/health`
- Teste `https://seu-app.fly.dev/admin-login.html`
- Teste login, criação de post e upload de imagem.
- Confirme se as imagens novas abrem por URL em `/uploads/posts/...`
- Faça um novo deploy de teste (`fly deploy` de novo, sem mudar nada) e confirme que o blog e as imagens continuam lá — é assim que se garante que o volume persistente está funcionando de verdade.

Domínio
- Depois que o deploy estiver funcionando, conecte o domínio personalizado com `fly certs add seudominio.com.br` e ajuste o DNS conforme as instruções que o comando mostrar.
- O SSL é emitido automaticamente pela plataforma.

Observações importantes
- Se você continuar usando SQLite, mantenha o volume (`constherme_data`/`/data`) sempre ativo — nunca delete ou recrie o volume sem antes fazer backup do conteúdo de `/data`.
- Se no futuro o volume crescer bastante, o ideal é migrar para PostgreSQL.
- Em produção, configure `SESSION_SECRET` e `DEFAULT_ADMIN_PASSWORD` antes do primeiro deploy.
- Após publicar, entre em [admin-login.html](C:/Users/Vitor/OneDrive/Área de Trabalho/site_constherme/frontend/admin-login.html) e troque a senha inicial do administrador.
