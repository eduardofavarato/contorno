# Contorno — Quiz de Países

Quiz de geografia interativo onde o jogador identifica países pelo contorno no mapa-múndi.

## Modos de jogo

### Modo Perguntas
Um país é destacado no mapa a cada rodada. O jogador digita o nome e tenta acertar antes que os pontos acabem.
- 10 países por rodada
- Até **2.000 pts** por acerto, **–200 pts** por erro, máximo de 3 tentativas

### Modo Continentes
Igual ao Modo Perguntas, mas todos os países de um continente escolhido.

### Modo Disputa
Dois jogadores no mesmo dispositivo. Alterna perguntas entre os jogadores — quem errar dá chance de roubo ao adversário. Empate aciona Rodada de Fogo.

### Modo Disputa Online
Igual ao Modo Disputa, mas cada jogador no seu próprio dispositivo, via WebSocket com o servidor próprio do Contorno (`server/`). Um jogador cria a sala, recebe um código de 4 caracteres e compartilha com o adversário.

### Modo Livre
Exploração sem pressão: clique em qualquer país para tentar adivinhar.

---

## Desenvolvimento

### Pré-requisitos

```
node >= 22
npm install && npm install --prefix server
```

### Estrutura do projeto

```
shared/
  countries.js  # Países, sinônimos e níveis: fonte única para o cliente e o servidor
src/
  css/          # Folhas de estilo separadas por contexto
  html/         # Partials HTML (telas e componentes)
  js/           # Módulos JavaScript do cliente
  template.html # Shell com diretivas @include
server/
  src/          # Servidor: serve o index.html e o Modo Disputa Online (WebSocket em /ws)
  test/         # Testes (node --test)
android/        # Projeto Android (Capacitor) do app
assets/         # Fontes do ícone do app (scripts/generate-icon.mjs)
build.js        # Compila tudo (incluindo d3/topojson, sem CDN) em index.html
Dockerfile      # Imagem de produção: build do cliente + servidor
```

### Build

Compila `src/`, `shared/` e as bibliotecas do mapa em um único `index.html`:

```bash
npm run build
```

`@include` insere o arquivo como está; `@include-module` também remove os `export` (usado para `shared/`). Nada é carregado de CDN, então todos os modos, exceto o online, funcionam sem internet.

> `index.html` é gerado: edite os arquivos em `src/` e `shared/`, nunca o `index.html` diretamente.

### Desenvolvimento

```bash
npm run dev   # build + servidor em http://localhost:8080 (página e WebSocket juntos)
npm test      # testes do servidor (lógica do duelo e WebSocket de ponta a ponta)
```

Para testar o modo online, abra duas abas em `http://localhost:8080`.

### App Android

O app (`br.com.fvrt.contorno`) empacota o mesmo `index.html` com [Capacitor](https://capacitorjs.com/) e é distribuído
pelo [WalduApps](https://walduapps.fvrt.com.br). O `server.hostname` do `capacitor.config.json` faz o app se apresentar como
`https://contorno.fvrt.com.br`, então o Modo Disputa Online usa o mesmo servidor e a mesma lista de origens da web.

```bash
npm run build:app                       # build em www/ + cap sync
cd android && ./gradlew assembleDebug   # JDK 21; APK em app/build/outputs/apk/debug/
```

- **Ícone:** gerado do próprio mapa por `node scripts/generate-icon.mjs` (contorno do Brasil) e depois `npx capacitor-assets generate --android`.
- **Publicar:** `git tag -a v1.2.3 -m "Novidades desta versão" && git push origin v1.2.3`. O workflow `android-release.yml`
  gera o APK assinado (versionCode 10203) e publica no WalduApps; a mensagem da tag aparece para os usuários.

### Deploy

Push na `main` roda `.github/workflows/cd.yml`: testes, depois imagem no GHCR (`ghcr.io/eduardofavarato/contorno`),
depois deploy no mini PC `fvrt` via Tailscale. Em produção, o container entra na rede da home-server e o Cloudflare
Tunnel publica `https://contorno.fvrt.com.br` (página e `/ws`).

---

## Tecnologias

- [D3.js v7](https://d3js.org/) + [TopoJSON](https://github.com/topojson/topojson) + [world-atlas](https://github.com/topojson/world-atlas) — mapa interativo
- Node.js + [ws](https://github.com/websockets/ws): servidor próprio do modo online
- HTML, CSS e JavaScript puros no cliente — sem framework
