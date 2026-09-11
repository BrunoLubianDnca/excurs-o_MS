# Publicar o TREK completo com Vercel e backend Node

## O que mudou

O commit 1130568 publicava `familia.html`/`dist-familia` e removia os proxies da
API. Esse caminho executava outro aplicativo, sem os módulos do TREK.
Agora ambos os `vercel.json` publicam `index.html`/`dist` do TREK completo.

Supabase não substitui o servidor NestJS/SQLite do TREK. O SQL antigo permanece
apenas como histórico. Não execute aquele SQL para instalar o TREK e não apague
uma base já utilizada: eventuais registros adicionados lá precisam ser migrados
separadamente.

## Backend

No serviço Node existente (`https://excurs-o-ms.onrender.com`):

- Instalação/build: `npm ci && npm run build`.
- Inicialização: `npm start`.
- Configure `NODE_ENV=production`, `HOST=0.0.0.0`, `DEFAULT_LANGUAGE=br`,
  `TZ=America/Campo_Grande`, `COOKIE_SECURE=true` e `APP_URL` com a URL pública.
- Para a primeira instalação, configure `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
  Para uma base existente, mantenha a conta atual; use `TREK_SETUP_EMAIL` e
  `TREK_SETUP_PASSWORD` apenas para preparar a excursão.
- Preserve `server/data` e `server/uploads` em disco persistente. Uma instância
  com sistema de arquivos descartável não é adequada para guardar esta viagem.

O backend também serve o TREK diretamente. Usar sua URL para toda a aplicação
simplifica uploads, WebSocket, cookies e integrações.

## Frontend na Vercel

Importe a raiz ou `client`. O comando configurado é `npm run build:vercel`,
com saída `dist`. O frontend usa `/api` e `/uploads` pelo proxy para o backend.
O modo `vercel` conecta o WebSocket diretamente ao serviço Render existente.
`VITE_WS_URL` permite substituir esse endereço (origem sem o sufixo `/ws`).
Se o backend mudar, ajuste também os destinos nos dois arquivos `vercel.json`.

Não configure o comando `vite build --mode familia`, `familia.html` nem
`dist-familia`. As variáveis `VITE_SUPABASE_*` não são usadas pelo TREK.
Nunca coloque credenciais administrativas em variáveis com prefixo `VITE_`.

Após publicar, confira login, viagem pré-carregada, inclusão de uma tarefa,
recarregamento, upload de documento e colaboração em duas sessões. Verifique
que `/api/health` retorna JSON e que a conexão `/ws` chega ao backend.
