import bcrypt from 'bcryptjs';

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

/** BCrypt with a work factor that can be lowered in tests; 12 is the production setting. */
export function createPasswordHasher(cost = 12): PasswordHasher {
  return {
    hash: (password) => bcrypt.hash(password, cost),
    verify: (password, hash) => bcrypt.compare(password, hash),
  };
}
