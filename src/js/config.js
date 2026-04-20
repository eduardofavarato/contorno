// For local dev: npm run dev (partykit dev runs on port 1999)
// For production: update to your deployed PartyKit host, e.g. contorno.username.partykit.dev
const PARTYKIT_HOST = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'localhost:1999'
  : 'contorno.eduardofavarato.partykit.dev';
