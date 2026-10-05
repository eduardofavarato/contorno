import { NAME_MAX_LENGTH, NAME_MIN_LENGTH, type LoginRequest, type SignupRequest, type User } from '@contorno/core';
import { and, eq, gt } from 'drizzle-orm';
import type { Db } from '../db/client';
import { refreshTokens, users } from '../db/schema';
import { ApiException } from '../http/errors';
import type { GoogleIdentityVerifier } from './google';
import type { PasswordHasher } from './passwords';
import { AccessTokens, newRefreshToken, REFRESH_TOKEN_TTL_MS, hashToken } from './tokens';

export interface Session {
  readonly user: User;
  readonly accessToken: string;
  /** Goes to the client in an httpOnly cookie, never in the response body. */
  readonly refreshToken: string;
}

interface AuthDeps {
  readonly db: Db;
  readonly hasher: PasswordHasher;
  readonly tokens: AccessTokens;
  /** `null` when no Google client id is configured. */
  readonly google: GoogleIdentityVerifier | null;
  readonly now: () => Date;
}

type UserRow = typeof users.$inferSelect;

const MYSQL_DUPLICATE_ENTRY = 'ER_DUP_ENTRY';

const invalidCredentials = () => new ApiException('INVALID_CREDENTIALS', 401, 'E-mail ou senha incorretos.');
const toUser = ({ id, name }: UserRow): User => ({ id, name });

function isDuplicateEntry(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string }; code?: string }).cause ?? (error as { code?: string });
  return cause.code === MYSQL_DUPLICATE_ENTRY;
}

/** Display name for a Google account that has none: the part of the e-mail before the @. */
function nameFrom(identity: { name: string; email: string }): string {
  const given = identity.name.trim();
  const fallback = identity.email.split('@')[0] ?? '';
  const name = (given === '' ? fallback : given).slice(0, NAME_MAX_LENGTH);
  return name.length >= NAME_MIN_LENGTH ? name : `Jogador ${name}`.trim();
}

export class AuthService {
  /** Hash checked when the e-mail is unknown, so a login takes the same time either way. */
  private readonly decoyHash: Promise<string>;

  constructor(private readonly deps: AuthDeps) {
    this.decoyHash = deps.hasher.hash('decoy-password');
  }

  get googleEnabled(): boolean {
    return this.deps.google !== null;
  }

  async signup({ name, email, password }: SignupRequest): Promise<Session> {
    const existing = await this.findByEmail(email);
    if (existing) throw this.emailTaken(existing);

    const passwordHash = await this.deps.hasher.hash(password);
    try {
      return await this.createSession(await this.insertUser({ name, email, passwordHash, googleSub: null }));
    } catch (error) {
      // Two sign-ups racing for the same e-mail: the unique index lets only one through.
      if (isDuplicateEntry(error)) throw new ApiException('EMAIL_TAKEN', 409, 'Este e-mail já está em uso.');
      throw error;
    }
  }

  async login({ email, password }: LoginRequest): Promise<Session> {
    const user = await this.findByEmail(email);
    if (!user) {
      await this.deps.hasher.verify(password, await this.decoyHash);
      throw invalidCredentials();
    }
    if (user.passwordHash === null) throw new ApiException('EMAIL_USES_GOOGLE', 409, 'Esta conta entra com o Google.');
    if (!(await this.deps.hasher.verify(password, user.passwordHash))) throw invalidCredentials();
    return this.createSession(user);
  }

  async loginWithGoogle(idToken: string): Promise<Session> {
    if (!this.deps.google) throw new ApiException('AUTH_DISABLED', 404, 'Login com o Google indisponível.');
    const identity = await this.deps.google.verify(idToken);

    const known = await this.findByGoogleSub(identity.sub);
    if (known) return this.createSession(known);

    const sameEmail = await this.findByEmail(identity.email);
    if (sameEmail) {
      // An account never merges with another by e-mail: there is no way here to prove the owner is the same.
      if (sameEmail.googleSub === null) {
        throw new ApiException('EMAIL_USES_PASSWORD', 409, 'Este e-mail já tem uma conta com senha.');
      }
      throw new ApiException('GOOGLE_TOKEN_INVALID', 401, 'Não foi possível validar o login com o Google.');
    }
    const created = await this.insertUser({
      name: nameFrom(identity),
      email: identity.email,
      passwordHash: null,
      googleSub: identity.sub,
    });
    return this.createSession(created);
  }

  /** Swaps a refresh token for a new session; each token works once, so a stolen copy dies on the owner's next use. */
  async refresh(refreshToken: string): Promise<Session> {
    const hash = hashToken(refreshToken);
    const { db, now } = this.deps;
    const user = await db.transaction(async (tx) => {
      const [row] = await tx
        .select({ user: users })
        .from(refreshTokens)
        .innerJoin(users, eq(users.id, refreshTokens.userId))
        .where(and(eq(refreshTokens.tokenHash, hash), gt(refreshTokens.expiresAt, now())));
      if (!row) return null;
      const [deleted] = await tx.delete(refreshTokens).where(eq(refreshTokens.tokenHash, hash));
      return deleted.affectedRows === 1 ? row.user : null;
    });
    if (!user) throw new ApiException('UNAUTHORIZED', 401, 'Sessão expirada. Faça login novamente.');
    return this.createSession(user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.deps.db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, hashToken(refreshToken)));
  }

  async getUser(id: number): Promise<User | null> {
    const [row] = await this.deps.db.select().from(users).where(eq(users.id, id));
    return row ? toUser(row) : null;
  }

  /** Erases the account; the database cascades to its sessions, games and scores. */
  async deleteAccount(id: number): Promise<void> {
    await this.deps.db.delete(users).where(eq(users.id, id));
  }

  private emailTaken(existing: UserRow): ApiException {
    return existing.passwordHash === null
      ? new ApiException('EMAIL_USES_GOOGLE', 409, 'Este e-mail já tem uma conta com o Google.')
      : new ApiException('EMAIL_TAKEN', 409, 'Este e-mail já está em uso.');
  }

  private async findByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await this.deps.db.select().from(users).where(eq(users.email, email));
    return row;
  }

  private async findByGoogleSub(sub: string): Promise<UserRow | undefined> {
    const [row] = await this.deps.db.select().from(users).where(eq(users.googleSub, sub));
    return row;
  }

  private async insertUser(values: Omit<typeof users.$inferInsert, 'id' | 'createdAt'>): Promise<UserRow> {
    const [result] = await this.deps.db.insert(users).values({ ...values, createdAt: this.deps.now() });
    const user = await this.getRow(result.insertId);
    if (!user) throw new Error('User vanished right after being created');
    return user;
  }

  private async getRow(id: number): Promise<UserRow | undefined> {
    const [row] = await this.deps.db.select().from(users).where(eq(users.id, id));
    return row;
  }

  private async createSession(user: UserRow): Promise<Session> {
    const refresh = newRefreshToken();
    await this.deps.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: refresh.hash,
      expiresAt: new Date(this.deps.now().getTime() + REFRESH_TOKEN_TTL_MS),
    });
    return { user: toUser(user), accessToken: await this.deps.tokens.issue(user.id), refreshToken: refresh.token };
  }
}
