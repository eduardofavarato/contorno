/** IBGE code of a state (e.g. 35 for São Paulo); also the id of its shape on the Brazil map. */
export type StateCode = number;

export interface BrasilState {
  readonly code: StateCode;
  /** Two-letter abbreviation, e.g. "SP". */
  readonly abbr: string;
  readonly name: string;
  readonly capital: string;
  /** Other spellings of the capital's name that should be accepted. */
  readonly capitalAliases: readonly string[];
}

export interface BrasilCity {
  /** IBGE municipality code. */
  readonly id: number;
  readonly name: string;
  readonly stateCode: StateCode;
  /** Residents, Censo 2022. */
  readonly population: number;
}
