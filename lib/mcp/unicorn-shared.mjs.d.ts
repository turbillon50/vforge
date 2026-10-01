export interface SharedUnicornDb {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface SharedCursor {
  t: string;
  k: string;
}

export interface PublishUnicornArgs {
  proyecto?: unknown;
  tipo?: unknown;
  titulo?: unknown;
  origen?: unknown;
  detalle?: unknown;
}

export interface PublishUnicornOpts {
  autor?: string | null;
  defaultOrigen?: string;
}

export interface PublishedUnicornEvent {
  fuente: "unicorn";
  id: string;
  proyecto: string;
  tipo: string;
  titulo: string;
  detalle: unknown;
  origen: string;
  ts: string;
  cursor: string;
}

export class UnicornParamError extends Error {}

export const UNICORN_DDL: readonly string[];

export function encodeCursor(c: SharedCursor): string;
export function ensureUnicornTable(db: SharedUnicornDb): Promise<void>;
export function resetUnicornEnsureForTests(): void;
export function publishUnicornEvent(
  db: SharedUnicornDb,
  args: PublishUnicornArgs,
  opts?: PublishUnicornOpts,
): Promise<
  | { ok: true; evento: PublishedUnicornEvent }
  | { ok: false; error: string }
>;
