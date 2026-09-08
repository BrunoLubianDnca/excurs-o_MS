# Excursão Família Lubian

> Para publicar sem Docker usando Vercel e Supabase, siga [VERCEL-SUPABASE.md](./VERCEL-SUPABASE.md).

Este arquivo documenta a primeira configuração funcional da versão da Família
Lubian. A carga usa somente as APIs públicas da própria aplicação; não grava no
SQLite diretamente e pode ser repetida sem duplicar a viagem, os convidados, o
custo, a reserva do ônibus, os pontos do mapa ou as tarefas.

## Executar

1. Inicie esta versão local com `npm run start:familia-lubian`. Ela abre em
   `http://127.0.0.1:3001` e usa Português (Brasil) como idioma padrão.
2. Conclua a criação da conta administrativa.
3. Garanta que os addons **Costs** e **Lists** estejam ativos.
4. No PowerShell, na raiz do projeto, execute:

```powershell
$env:TREK_SETUP_URL = 'http://127.0.0.1:3001'
$env:TREK_SETUP_EMAIL = 'seu-email'
$env:TREK_SETUP_PASSWORD = 'sua-senha'
npm run setup:familia-lubian
```

As credenciais não são gravadas em arquivo nem exibidas pelo inicializador.
Depois da carga, remova-as da sessão do PowerShell:

```powershell
Remove-Item Env:TREK_SETUP_EMAIL
Remove-Item Env:TREK_SETUP_PASSWORD
```

Se a conta usa MFA, faça a carga inicialmente com uma conta administrativa
temporária sem MFA. O inicializador se recusa a prosseguir quando o login exige
o segundo fator.

## Dados iniciais

- Período: 30/10/2026 a 02/11/2026.
- Moeda: real brasileiro (BRL).
- Embarque: Rua Augusta, 45, Garcia, Blumenau/SC.
- Destino confirmado pelo link da família: Rua Izidora Vilhalva, 380,
  Tacuru/MS (coordenadas `-23.6337505, -55.0129758`).
- Fuso operacional: `America/Campo_Grande` (UTC−4). Em Tacuru, os relógios
  ficam uma hora atrás de Blumenau, que usa `America/Sao_Paulo` (UTC−3).
- Mapa padrão da conta: MapLibre GL com OpenFreeMap Bright, oferecendo ruas,
  estradas e cidades mais legíveis em um visual semelhante ao Google Maps, sem
  exigir uma chave paga do Google.
- 36 passageiros cadastrados como convidados sem conta.
- Transporte-base: cotação da Catarinense de R$ 18.000,00, ônibus rodoviário
  de 46 lugares. A cotação anterior de R$ 22.000,00 fica apenas como histórico
  da análise, não como custo somado à viagem.
- Reserva do ônibus vinculada aos 36 passageiros e aos quatro dias da viagem,
  com origem, destino, coordenadas e fusos gravados no trajeto.
- Retorno-base em 02/11/2026; 01/11/2026 permanece como alternativa a confirmar.
- Tarefas iniciais para resolver cadastro, pagamento, motoristas e demais
  pendências da viagem.

O arquivo `config/familia-lubian.excursion.json` é a fonte editável dessa carga.
Dados pessoais sensíveis, como documentos, telefones e informações médicas,
deliberadamente não ficam versionados no repositório.
