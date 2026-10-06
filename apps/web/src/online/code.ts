/** Length of a room code. */
export const CODE_LENGTH = 4;

/** The message that invites someone to a room; the code is typed under "Entrar com código" on the game's page. */
export function inviteMessage(code: string): string {
  return `Vem jogar Contorno comigo! Código da sala: ${code}\nhttps://contorno.fvrt.com.br`;
}
