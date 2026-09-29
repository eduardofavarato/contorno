// Online duel server. In production the page is served by that same server (and the app spoofs its origin to it);
// locally, `npm run dev` serves page + WebSocket together on localhost:8080.
const ONLINE_WS_URL = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? `ws://${location.host}/ws`
  : 'wss://contorno.fvrt.com.br/ws';
