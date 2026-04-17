# Contorno — Quiz de Países

Quiz de geografia interativo onde o jogador identifica países pelo contorno no mapa-múndi.

## Como jogar

Abra o arquivo `index.html` diretamente no navegador. Nenhuma instalação ou servidor necessário.

> Requer conexão com a internet para carregar o mapa (D3.js + world-atlas via CDN).

## Modos de jogo

### Modo Perguntas
Um país é destacado no mapa a cada rodada. O jogador digita o nome e tenta acertar antes que os pontos acabem.

- 10 países por rodada
- Cada país vale até **2.000 pontos**
- Cada resposta errada custa **–200 pontos**
- Tentativas ilimitadas por país
- Pontuação máxima: **20.000 pontos**

### Modo Livre
Exploração livre do mapa sem pressão de tempo.

- Clique em qualquer país para tentar adivinhar o nome
- Uma tentativa por país
- Países acertados ficam verdes, erros ficam vermelhos
- Tooltip ao passar o mouse mostra o resultado de cada tentativa
- Acertos são contabilizados no placar

## Funcionalidades

- Mapa-múndi interativo com projeção Natural Earth
- Zoom via scroll do mouse ou botões **+** / **−** (até 5×)
- Aceita nomes em português e inglês
- ~120 países disponíveis

## Tecnologias

- [D3.js v7](https://d3js.org/)
- [TopoJSON](https://github.com/topojson/topojson)
- [Natural Earth / world-atlas](https://github.com/topojson/world-atlas)
- HTML, CSS e JavaScript puros — sem framework, sem build
