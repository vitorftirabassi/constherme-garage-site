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

## Conectar um domínio do Registro.br ao Fly.io

Use esta seção se o site já estiver publicado no Fly.io e o domínio estiver
registrado no Registro.br. No exemplo, substitua `seudominio.com.br` pelo
domínio real e `NOME_DA_APP` pelo nome da aplicação no Fly.io.

### 1. Confirmar que a aplicação está funcionando no Fly.io

No terminal, instale e autentique o `flyctl` caso ainda não tenha feito isso:

```bash
fly auth login
fly apps list
fly status -a NOME_DA_APP
```

Abra `https://NOME_DA_APP.fly.dev` e confirme que o site e
`https://NOME_DA_APP.fly.dev/api/health` respondem antes de alterar o DNS.

O `internal_port` no `fly.toml` precisa ser a mesma porta usada pelo servidor
(neste projeto, `3000`, ou o valor de `PORT`). O servidor Express já usa a
porta fornecida pelo Fly.io por meio de `process.env.PORT`.

### 2. Adicionar o domínio ao certificado do Fly.io

Adicione o domínio principal e, se quiser que `www` também funcione, adicione
o subdomínio separadamente:

```bash
fly certs add seudominio.com.br -a NOME_DA_APP
fly certs add www.seudominio.com.br -a NOME_DA_APP
```

O Fly.io exibirá os registros DNS específicos da aplicação. Consulte-os
novamente a qualquer momento com:

```bash
fly certs setup seudominio.com.br -a NOME_DA_APP
fly certs setup www.seudominio.com.br -a NOME_DA_APP
```

Não copie IPs de exemplos da internet: use exatamente os valores exibidos
nesses comandos. Em geral, o domínio principal usa registros `A` e `AAAA`, e
`www` usa um `CNAME`.

### 3. Configurar a zona DNS no Registro.br

1. Acesse [registro.br](https://registro.br), entre na conta e abra o domínio.
2. Se aparecem somente **Alterar servidores DNS** e **Selecionar provedor de
   serviços**, o domínio está delegado a um provedor e o editor da zona não
   está disponível nessa tela. O Fly.io não fornece nameservers autoritativos,
   então não selecione “Fly.io” como provedor.
3. Escolha uma das alternativas:
   - **Gerenciar pelo próprio Registro.br:** se os servidores DNS atuais
     forem de outro serviço, anote-os (para poder reverter), abra **Alterar
     servidores DNS**, clique em **UTILIZAR DNS DO REGISTRO.BR** e salve.
     Aguarde a transição; depois abra **Configurar endereçamento** e, nessa
     tela simples, use o link para o **modo avançado** (zona DNS completa).
     A tela simples só aceita um endereço de site e um servidor de e-mail,
     e cria registros que precisam ser corrigidos no modo avançado.
   - **Usar um provedor DNS externo:** crie uma zona em um serviço como
     Cloudflare, copie os nameservers fornecidos por esse serviço e cole-os em
     **Alterar servidores DNS** no Registro.br. Os registros do Fly.io serão
     criados no painel desse provedor externo.
4. Para o domínio principal (`seudominio.com.br`), crie os registros `A` e
   `AAAA` indicados pelo `fly certs setup`. No modo avançado do Registro.br o
      campo **Nome** pede o nome completo (por exemplo, `seudominio.com.br`,
      `www.seudominio.com.br`); em outros provedores, use `@` ou o nome curto.
   5. Para `www.seudominio.com.br`, crie um registro `CNAME` com destino
      `.fly.dev` exibido pelo Fly.io. Não inclua `http://` nem uma porta.
6. Remova registros antigos conflitantes para o mesmo nome, especialmente
   outro `A`, `AAAA` ou `CNAME`. Não use `CNAME` na raiz, a menos que o
   provedor ofereça explicitamente `ALIAS`, `ANAME` ou CNAME flattening.
7. Salve a zona DNS. Se aparecer “Conflito em Record CNAME”, ainda existe um
   CNAME antigo para o mesmo nome (por exemplo, `www` apontando para o
   próprio domínio): exclua-o, salve e cadastre o novo.

Crie também o CNAME `_acme-challenge` de cada hostname (domínio e `www`)
exatamente como mostrado pelo `fly certs setup`; é ele que valida o
certificado. O TXT `_fly-ownership` é um método alternativo e não foi
necessário quando os CNAMEs `_acme-challenge` estavam cadastrados.

Se o domínio usa e-mail em outro serviço (por exemplo, Hostinger), recrie na
nova zona todos os registros desse serviço: `MX`, `TXT` (SPF), CNAMEs de DKIM,
`autoconfig` e `autodiscover`. Trocar os servidores DNS não os copia sozinho.

### 4. Aguardar e validar o DNS e o HTTPS

Consulte a propagação localmente:

```powershell
Resolve-DnsName seudominio.com.br -Type A
Resolve-DnsName seudominio.com.br -Type AAAA
Resolve-DnsName www.seudominio.com.br -Type CNAME
```

Depois confira o certificado no Fly.io:

```bash
fly certs check seudominio.com.br -a NOME_DA_APP
fly certs check www.seudominio.com.br -a NOME_DA_APP
```

Enquanto o status mostrar `Issuing...`, aguarde; quando mudar para `Issued`
(também visível em **Certificates** no painel), teste `https://seudominio.com.br`,
`https://www.seudominio.com.br` e `/api/health`. A propagação pode começar em
minutos, mas alterações de DNS podem levar até 24–48 horas dependendo do TTL e
do cache usado pelos resolvedores.

### Problemas comuns

- **Certificado pendente:** confirme que o `A`/`AAAA` e o eventual registro de
  validação são exatamente os mostrados em `fly certs setup`.
- **`www` não abre:** confirme que o `CNAME` aponta para o hostname `.fly.dev`
  correto e que não existe outro registro para `www`.
- **O domínio continua mostrando o site antigo:** reduza o TTL antes da troca
  (se possível), remova registros antigos e aguarde o cache expirar.
- **A zona não pode ser editada no Registro.br:** o domínio está usando
  servidores DNS externos; faça a configuração no provedor indicado em
  **Servidores DNS**.
- **O Fly.io não encontra a aplicação:** confirme o app com `fly apps list` e
  inclua `-a NOME_DA_APP` nos comandos.

Observações importantes
- Se você continuar usando SQLite, mantenha o disco persistente ativo.
- Se no futuro o volume crescer bastante, o ideal é migrar para PostgreSQL.
- Em produção, configure `SESSION_SECRET` e `DEFAULT_ADMIN_PASSWORD` antes do primeiro deploy.
- Após publicar, entre em [admin-login.html](C:/Users/Vitor/OneDrive/Área de Trabalho/site_constherme/frontend/admin-login.html) e troque a senha inicial do administrador.
