/** ISO 3166-1 numeric code, the same id the world map uses for each feature. */
export type CountryId = number;

export type Level = 1 | 2 | 3;

export interface Country {
  readonly id: CountryId;
  /** Display name (pt-BR). */
  readonly name: string;
  /** Accepted typed answers; compared after `normalize`. */
  readonly aliases: readonly string[];
  /** Easiest level whose pool includes this country. */
  readonly level: Level;
}
