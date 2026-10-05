# Contorno — Quiz de Países

Quiz de geografia interativo onde o jogador identifica países pelo contorno no mapa-múndi.

## Modos e formatos

Cada modo (menos o Livre) pode ser jogado em dois **formatos**: **Individual** ou **Disputa**.

| Modo            | Como se responde                               | De onde vêm os países                  |
| --------------- | ---------------------------------------------- | -------------------------------------- |
| **Perguntas**   | Digitando o nome do país destacado no mapa     | Nível Fácil, Médio ou Difícil          |
| **Continentes** | Digitando o nome do país destacado no mapa     | Um continente escolhido                |
| **Localizar**   | Clicando no país cujo nome é mostrado          | Nível Fácil, Médio ou Difícil          |
| **Livre**       | Clicando em qualquer país e digitando o nome   | Todo o mapa, sem pressão               |

### Individual

- 10 países por rodada (em Continentes, todos os do continente).
- Até **2.000 pts** por acerto, **–200 pts** por erro, no máximo 3 tentativas por país.

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
  server/     # Fastify: serve o cliente e hospeda a Disputa Online (WebSocket em /ws), com o duelo autoritativo
Dockerfile    # Imagem de produção: servidor + cliente
```

Princípios:

- **Uma só implementação das regras.** `core` define os motores como funções puras (`reducer(estado, evento) → estado`);
  o jogo local roda no cliente e a Disputa Online roda no servidor com o mesmo código.
- **Modo = desafio × pool × formato.** Digitar ou clicar, nível ou continente, individual ou disputa: um novo modo é
  uma nova combinação, não uma nova cópia da tela.
- O servidor só envia ao cliente o que a tela precisa (`DuelView`), nunca as perguntas futuras.

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
`ALLOWED_ORIGINS` (origens aceitas no WebSocket, separadas por vírgula; vazio aceita qualquer uma).

### App Android

O app (`br.com.fvrt.contorno`) empacota o mesmo cliente com [Capacitor](https://capacitorjs.com/) e é distribuído
pelo [WalduApps](https://walduapps.fvrt.com.br). O `server.hostname` do `capacitor.config.json` faz o app se apresentar como
`https://contorno.fvrt.com.br`, então a Disputa Online usa o mesmo servidor e a mesma lista de origens da web.
O botão voltar do sistema anda pelas telas (e sai do app na tela inicial).

```bash
npm run build:app -w @contorno/web      # build do cliente + cap sync
cd apps/web/android && ./gradlew assembleDebug   # JDK 21; APK em app/build/outputs/apk/debug/
```

- **Ícone:** `npm run icons -w @contorno/web` desenha o contorno do Brasil a partir do próprio mapa e gera os PNGs.
- **Publicar:** `git tag -a v1.2.3 -m "Novidades desta versão" && git push origin v1.2.3`. O workflow `android-release.yml`
  gera o APK assinado (versionCode 10203) e publica no WalduApps; a mensagem da tag aparece para os usuários.

### Deploy

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
- [Capacitor](https://capacitorjs.com/) — app Android
