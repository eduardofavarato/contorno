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
Igual ao Modo Disputa, mas cada jogador no seu próprio dispositivo via WebSocket (PartyKit). Um jogador cria a sala e compartilha o código de 4 caracteres com o adversário.

### Modo Livre
Exploração sem pressão: clique em qualquer país para tentar adivinhar.

---

## Desenvolvimento

### Pré-requisitos

```
node >= 18
npm install
```

### Estrutura do projeto

```
src/
  css/          # Folhas de estilo separadas por contexto
  html/         # Partials HTML (telas e componentes)
  js/           # Módulos JavaScript
  template.html # Shell com diretivas @include
party/
  disputa.js    # Servidor PartyKit (Modo Disputa Online)
build.js        # Script de build — compila tudo em index.html
index.html      # Saída compilada (não editar diretamente)
partykit.json   # Configuração do servidor PartyKit
```

### Build

Compila todos os arquivos de `src/` em um único `index.html`:

```bash
npm run build
```

O build resolve as diretivas `@include` do `src/template.html` e concatena CSS, HTML e JS em linha. Sempre rode o build antes de testar ou commitar mudanças no `index.html`.

> `index.html` é gerado — edite os arquivos em `src/`, nunca o `index.html` diretamente.

### Servidor local (Modo Disputa Online)

Para testar o modo online localmente, suba o servidor PartyKit:

```bash
npm run dev
```

O servidor roda em `localhost:1999`. O `index.html` já detecta automaticamente se está em localhost e aponta para esse endereço.

Abra dois abas do navegador com o `index.html` para simular dois jogadores.

### Deploy do servidor online

```bash
npm run deploy
```

Publica o servidor em `contorno.eduardofavarato.partykit.dev`. Requer login (`npx partykit login`).

---

## Tecnologias

- [D3.js v7](https://d3js.org/) + [TopoJSON](https://github.com/topojson/topojson) + [world-atlas](https://github.com/topojson/world-atlas) — mapa interativo
- [PartyKit](https://partykit.io/) — WebSocket para o modo online
- HTML, CSS e JavaScript puros no cliente — sem framework
