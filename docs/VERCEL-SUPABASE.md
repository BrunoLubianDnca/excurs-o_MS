# Publicar a viagem na Vercel com Supabase

Esta versão foi preparada para uma única viagem, sem Docker e sem servidor próprio. A Vercel publica as telas; o Supabase guarda as alterações para todos os celulares.

## 1. Criar o banco no Supabase

1. Acesse <https://supabase.com/dashboard> e crie um projeto gratuito.
2. No menu do projeto, abra **SQL Editor** e clique em **New query**.
3. Copie todo o conteúdo de [`supabase/schema-and-seed.sql`](../supabase/schema-and-seed.sql), cole e clique em **Run**.
4. Em **Project Settings > API**, copie:
   - **Project URL**;
   - **Publishable key** ou a chave **anon public**.

O script cria a viagem, os 36 passageiros, as 10 pendências, o ônibus de 46 lugares e o orçamento inicial de R$ 18.000.

## 2. Enviar ao GitHub

Crie um repositório **privado** vazio no GitHub. Neste projeto, troque o remoto do TREK original pelo seu repositório:

```powershell
git remote rename origin upstream
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git add .
git commit -m "Configura excursao Familia Lubian"
git push -u origin main
```

Se você preferir preservar o nome `origin` atual, use `git remote set-url origin` com a URL do seu repositório. Não tente enviar alterações ao repositório oficial do TREK.

## 3. Publicar na Vercel

1. Acesse <https://vercel.com/new> e importe o repositório do GitHub.
2. Você pode manter **Root Directory** na raiz do repositório ou selecionar `client`; as duas opções estão configuradas.
3. O arquivo `vercel.json` correspondente já define o comando e a pasta `dist-familia`; não é preciso configurar Docker.
4. Em **Environment Variables**, adicione:

| Nome | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL copiada do Supabase |
| `VITE_SUPABASE_ANON_KEY` | Publishable key ou anon public copiada do Supabase |
| `VITE_FAMILY_TRIP_SLUG` | `familia-lubian` |

5. Clique em **Deploy**. Ao terminar, abra o endereço fornecido pela Vercel.

## 4. Teste rápido

No site publicado:

1. marque um passageiro como confirmado;
2. abra o mesmo link em outro celular ou numa aba anônima;
3. confirme que a alteração aparece;
4. adicione e remova uma pendência de teste;
5. abra **Viagem > Abrir rota no Google Maps**.

## Rodar a versão Supabase no computador

Crie `client/.env.local` com as mesmas três variáveis e execute:

```powershell
npm run dev:familia --workspace=client
```

Acesse `http://localhost:5173/familia.html`.

## Privacidade desta versão simples

Não existe login: qualquer pessoa que possuir o link consegue visualizar e editar. Isso atende ao uso rápido de uma única viagem, mas CPF e telefone são dados pessoais. Evite preencher esses campos se o link puder circular fora da família. Caso seja necessário, o login pode ser reativado mais tarde sem trocar de hospedagem.
