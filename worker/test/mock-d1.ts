import { DatabaseSync } from 'node:sqlite';

export class MockD1PreparedStatement {
  private boundValues: any[] = [];

  constructor(
    private readonly db: DatabaseSync,
    private readonly query: string,
  ) {}

  bind(...values: any[]): MockD1PreparedStatement {
    this.boundValues = values.map((v) => {
      if (typeof v === 'boolean') return v ? 1 : 0;
      if (v === undefined) return null;
      return v;
    });
    return this;
  }

  async first<T = unknown>(colName?: string): Promise<T | null> {
    try {
      const stmt = this.db.prepare(this.query);
      const row = stmt.get(...this.boundValues) as Record<string, any> | undefined;
      if (!row) return null;
      if (colName) return (row[colName] as T) ?? null;
      return row as T;
    } catch (err) {
      throw new Error(`D1 query error in first(): ${(err as Error).message} (SQL: ${this.query})`);
    }
  }

  async all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta: { changes: number } }> {
    try {
      const stmt = this.db.prepare(this.query);
      const rows = stmt.all(...this.boundValues) as T[];
      return {
        results: rows,
        success: true,
        meta: { changes: 0 },
      };
    } catch (err) {
      throw new Error(`D1 query error in all(): ${(err as Error).message} (SQL: ${this.query})`);
    }
  }

  async run<T = unknown>(): Promise<{ results: T[]; success: boolean; meta: { changes: number; last_row_id?: number } }> {
    try {
      const stmt = this.db.prepare(this.query);
      const res = stmt.run(...this.boundValues);
      return {
        results: [],
        success: true,
        meta: {
          changes: res.changes,
          last_row_id: Number(res.lastInsertRowid),
        },
      };
    } catch (err) {
      throw new Error(`D1 query error in run(): ${(err as Error).message} (SQL: ${this.query})`);
    }
  }
}

export class MockD1Database {
  private readonly db: DatabaseSync;

  constructor() {
    this.db = new DatabaseSync(':memory:');
    // Enable WAL and foreign keys
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  prepare(query: string): MockD1PreparedStatement {
    return new MockD1PreparedStatement(this.db, query);
  }

  async batch<T = unknown>(statements: MockD1PreparedStatement[]): Promise<any[]> {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.run<T>());
      }
      this.db.exec('COMMIT;');
      return results;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  async exec(query: string): Promise<{ count: number; duration: number }> {
    this.db.exec(query);
    return { count: 0, duration: 0 };
  }
}

export function createMockD1Database(): D1Database {
  return new MockD1Database() as unknown as D1Database;
}
