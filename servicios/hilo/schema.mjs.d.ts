export declare const HILO_DDL: readonly string[];
export declare function ensureHiloSchema(db: { query: (sql: string) => Promise<unknown> }): Promise<void>;
