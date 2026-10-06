# Contorno — Quiz de Países

Quiz de geografia interativo onde o jogador identifica países pelo contorno no mapa-múndi.

## Modos e formatos

Cada modo (menos o Livre) pode ser jogado em dois **formatos**: **Individual** ou **Disputa**.

| Modo            | Como se responde                               | De onde vêm os países                  |
| --------------- | ---------------------------------------------- | -------------------------------------- |
| **Perguntas**   | Digitando o nome do país destacado no mapa     | Nível Fácil, Médio ou Difícil          |
| **Continentes** | Digitando o nome do país destacado no mapa     | Um continente escolhido                |
| **Localizar**   | Clicando no país cujo nome é mostrado          | Nível Fácil, Médio ou Difícil          |
| **Especial Brasil** | Estados e Capitais: digitando; Cidades: clicando no estado | Tema: Estados, Capitais ou Cidades (mapa do Brasil) |
| **Livre**       | Clicando em qualquer país e digitando o nome   | Todo o mapa, sem pressão               |

### Especial Brasil

Usa o mapa dos 27 estados (malha oficial do IBGE) no lugar do mapa-múndi. Em vez de dificuldade, escolhe-se o tema:

- **Estados:** um estado é destacado; digite o nome ou a sigla (`SP`).
- **Capitais:** um estado é destacado; digite a capital.
- **Cidades:** o nome de uma cidade é mostrado; clique no estado a que ela pertence. São as 3 mais populosas de cada
  estado depois da capital (Censo 2022); o Distrito Federal não entra, pois só tem a capital.

### Individual

- 10 países por rodada (em Continentes, todos os do continente).
- Até **2.000 pts** por acerto, **–200 pts** por erro, no máximo 3 tentativas por país.

### Contas e ranking

Entrar é opcional: sem conta, tudo funciona como antes (inclusive offline no app). Logado, a partida individual vale ponto
no **ranking** do seu modo e configuração (Perguntas · Fácil, Continentes · Europa, Especial Brasil · Capitais…). Cada
partida é uma linha; ordena por pontos (maior) e desempata pelo tempo (menor). A Disputa não entra.

- **Login:** e-mail e senha (BCrypt, sem confirmação de e-mail e sem "esqueci a senha", como os outros apps) ou Google.
- **Sem trapaça:** ao iniciar, o servidor sorteia as perguntas e marca a hora; ao terminar, o app envia as jogadas e o
  servidor **refaz a partida** com os mesmos motores do `core`, recalcula os pontos e mede o tempo no relógio dele. Partida
  rápida demais, incompleta ou repetida é recusada, e cada sessão vale uma vez.
- **Privacidade:** o ranking mostra só o nome da conta (nunca o e-mail), e "Excluir minha conta" apaga conta e pontuações.

### Disputa

Dois jogadores alternam as perguntas: quem errar (ou desistir) dá ao adversário uma chance de **roubo** de 1.000 pts.

- 10 perguntas, 1 tentativa cada (em Continentes, até 10 países sorteados do continente).
- Empate: **Rodada de Fogo** — os dois respondem o mesmo país; quem acertar sozinho vence.
- **Local** (no mesmo dispositivo) ou **Online**: cada jogador no seu aparelho, via WebSocket. Quem cria a sala recebe um
  código de 4 caracteres para o adversário entrar.

---

## Desenvolvimento

### Pré-requisitos

```
node >= 22
npm install
```

### Estrutura (monorepo npm workspaces)

```
packages/
  core/       # Regras do jogo em TypeScript puro (sem DOM): países, pools, motores Individual/Disputa/Livre, protocolo online
apps/
  web/        # Cliente React + Vite (mapa em d3-geo) e o app Android (Capacitor)
  server/     # Fastify: serve o cliente, a Disputa Online (WebSocket em /ws) e a API de contas e ranking (/api/v1, MySQL)
Dockerfile    # Imagem de produção: servidor + cliente
```

Princípios:

- **Uma só implementação das regras.** `core` define os motores como funções puras (`reducer(estado, evento) → estado`);
  o jogo local roda no cliente e a Disputa Online roda no servidor com o mesmo código.
- **Modo = desafio × pool × formato.** Digitar ou clicar, nível ou continente, individual ou disputa: um novo modo é
  uma nova combinação, não uma nova cópia da tela.
- **Pergunta como unidade.** Os motores trabalham com `Question` (região do mapa, texto perguntado, resposta e respostas
  aceitas), não com países: mundo, estados, capitais e cidades são só quizzes diferentes que produzem perguntas.
- O servidor só envia ao cliente o que a tela precisa (`DuelView`): nunca as perguntas futuras nem as respostas aceitas,
  e a resposta só vai depois que ninguém mais precisa respondê-la.

### Dados do Brasil

Gerados a partir das APIs públicas do IBGE, para serem reproduzíveis:

```bash
node packages/core/scripts/generate-brasil-data.mjs   # estados, capitais e as 3 maiores cidades de cada estado
node apps/web/scripts/generate-brasil-map.mjs         # malha dos estados em TopoJSON
```

### Comandos

```bash
npm run dev:server   # servidor em http://localhost:8080 (WebSocket em /ws)
npm run dev:web      # cliente em http://localhost:5173 (proxy de /ws para o servidor)
npm test             # testes de core, server e web (Vitest)
npm run lint         # ESLint (strict, com tipos)
npm run typecheck    # tsc em cada pacote
npm run format       # Prettier
npm run build        # core/web/server
```

Para testar a Disputa Online, rode servidor e cliente e abra duas abas em `http://localhost:5173`.

Variáveis do servidor: `PORT` (8080), `HOST`, `PUBLIC_DIR` (pasta do cliente compilado, para servir a página) e
`ALLOWED_ORIGINS` (origens aceitas no WebSocket e nos POSTs de login, separadas por vírgula; vazio aceita qualquer uma).

Contas e ranking só ligam com banco; sem `DATABASE_URL` o servidor roda só com o jogo e o cliente esconde "Entrar" e "Ranking":

| Variável | Para quê |
| --- | --- |
| `DATABASE_URL` | `mysql://usuário:senha@host:3306/contorno`; as migrations (`apps/server/drizzle`) rodam no boot |
| `JWT_SECRET` | chave HS256 dos tokens de acesso (mín. 32 caracteres) |
| `GOOGLE_CLIENT_ID` | cliente OAuth "Web" do Google (vários, separados por vírgula); vazio desliga o login com Google |

```bash
docker run -d --name contorno-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=contorno mysql:8.4
DATABASE_URL=mysql://root:root@localhost:3306/contorno JWT_SECRET=$(openssl rand -hex 32) npm run dev:server
npm run db:generate -w @contorno/server   # nova migration depois de mexer em apps/server/src/db/schema.ts
```

Os testes de integração do servidor sobem um MySQL descartável (Testcontainers), então precisam de Docker. Com Colima:
`DOCKER_HOST=unix://$HOME/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock npm test`.
Sem Docker, `npm run test:unit -w @contorno/server` roda só os testes sem banco.

### App Android

O app (`br.com.fvrt.contorno`) empacota o mesmo cliente com [Capacitor](https://capacitorjs.com/) e é distribuído
pelo [WalduApps](https://walduapps.fvrt.com.br). O `server.hostname` do `capacitor.config.json` faz o app se apresentar como
`https://contorno.fvrt.com.br`, então a Disputa Online usa o mesmo servidor e a mesma lista de origens da web.
O botão voltar do sistema anda pelas telas (e sai do app na tela inicial).
Como a página do app é servida pelo Capacitor no mesmo host do servidor, o WebView responderia as chamadas `/api` com os
arquivos do app: por isso, no Android, `apps/web/src/api/http.ts` usa o HTTP nativo (`CapacitorHttp`) e o plugin
`CapacitorCookies` guarda o cookie de refresh, o que mantém o login entre aberturas do app.

```bash
npm run build:app -w @contorno/web      # build do cliente + cap sync
cd apps/web/android && ./gradlew assembleDebug   # JDK 21; APK em app/build/outputs/apk/debug/
```

- **Ícone:** `npm run icons -w @contorno/web` desenha o contorno do Brasil a partir do próprio mapa e gera os PNGs.
- **Publicar:** `git tag -a v1.2.3 -m "Novidades desta versão" && git push origin v1.2.3`. O workflow `android-release.yml`
  gera o APK assinado (versionCode 10203) e publica no WalduApps; a mensagem da tag aparece para os usuários.

### Deploy

Em produção o servidor usa o MySQL compartilhado do `home-server` (rede `home-server_default`, host `mysql`). Uma vez só:
criar o banco e o usuário (`CREATE DATABASE contorno; CREATE USER 'contorno'@'%' ...; GRANT ALL ON contorno.*`) e criar
`~/contorno/.env` no host a partir de `.env.example` (senha do banco, `JWT_SECRET`, ID do cliente Google). Esse `.env` nunca
vai para o git. O login com Google exige um cliente OAuth "Web" (origem `https://contorno.fvrt.com.br`) e, para o app,
um cliente "Android" (`br.com.fvrt.contorno` + SHA-1 da `walduapps-release.jks`) no mesmo projeto.

Push na `main` roda `.github/workflows/cd.yml`: verificação (`ci.yml`: formato, lint, tipos, testes e build), depois imagem
no GHCR (`ghcr.io/eduardofavarato/contorno`), depois deploy no mini PC `fvrt` via Tailscale. Em produção, o container
entra na rede da home-server e o Cloudflare Tunnel publica `https://contorno.fvrt.com.br` (página e `/ws`). O antigo
endereço do GitHub Pages (`eduardofavarato.github.io/contorno`) só redireciona para lá, a partir de `docs/index.html`.

---

## Tecnologias

- TypeScript (strict), npm workspaces, Vitest, ESLint + Prettier
- [React](https://react.dev/) + [Vite](https://vite.dev/) — cliente; [d3-geo](https://d3js.org/d3-geo) +
  [d3-zoom](https://d3js.org/d3-zoom) + [TopoJSON](https://github.com/topojson/topojson) — mapa interativo
- [Fastify](https://fastify.dev/) + [ws](https://github.com/websockets/ws) + [zod](https://zod.dev/) — servidor e protocolo
- MySQL + [Drizzle ORM](https://orm.drizzle.team/) (migrations em SQL), [jose](https://github.com/panva/jose) (JWT e Google), bcryptjs
- [Capacitor](https://capacitorjs.com/) — app Android
