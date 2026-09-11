# TREK completo — Excursão Família Lubian

A aplicação padrão é o TREK original: roteiro diário, mapas, reservas, membros,
custos e rateio, tarefas, documentos, colaboração e modo offline. A interface
simplificada com Supabase foi retirada do fluxo de execução.

## Executar no computador

1. Use Node.js 22 e execute `npm ci` na raiz.
2. Copie `.env.example` para `.env`. Defina `ADMIN_EMAIL` e uma senha própria em
   `ADMIN_PASSWORD` antes do primeiro início. Não versione esse arquivo.
3. Execute `npm run build` e `npm start`.
4. Abra `http://127.0.0.1:3001`. Entre com a conta configurada e conclua a troca
   obrigatória de senha no primeiro acesso.

O build inclui frontend e backend e copia as telas para `server/public`.
O inicializador aguarda a API e carrega a excursão uma única vez quando as
credenciais estão configuradas. `server/data/familia-lubian.seed` registra o
sucesso; reiniciar não redefine a conta nem sobrescreve a organização da viagem.

Em uma instalação que já possui conta, use `TREK_SETUP_EMAIL` e
`TREK_SETUP_PASSWORD` com as credenciais atuais para a primeira carga. As
variáveis `ADMIN_*` nunca alteram usuários existentes.

## Dados da excursão

A fonte é `config/familia-lubian.excursion.json`: viagem de 30/10 a 02/11/2026,
36 convidados (incluindo duas Helenas), ônibus de R$ 18.000, pontos de embarque
e destino, reserva vinculada aos passageiros e pendências de organização.
A conta recebe português brasileiro, BRL e mapa OpenFreeMap Bright.

Os módulos completos permanecem disponíveis nos menus do TREK. Os passageiros
sem conta são convidados da viagem; para a família colaborar com login, use os
convites e permissões nativos. Documentos ficam no módulo de arquivos protegido.

`npm run setup:familia-lubian` permite reaplicar a configuração manualmente, com
`TREK_SETUP_URL`, `TREK_SETUP_EMAIL` e `TREK_SETUP_PASSWORD`. Essa operação atualiza
os campos da viagem, custo e reserva com a configuração; use-a deliberadamente.
Não é uma migração dos registros do Supabase. Não apaga o banco do Supabase.

## Publicação

A forma mais completa é servir o frontend e a API juntos com `npm run build`
e `npm start` em um servidor Node persistente. Configure `NODE_ENV=production`,
`HOST=0.0.0.0`, `APP_URL` com o endereço HTTPS público e cookies seguros.
Preserve `server/data` e `server/uploads` entre deploys: SQLite, chaves e arquivos
não podem ficar em armazenamento temporário. Faça backups pelo painel do TREK.

A Vercel continua configurada como alternativa para o frontend completo; veja
`docs/VERCEL-SUPABASE.md` para os requisitos do backend separado.
