import { Pool, type QueryResult, type QueryResultRow } from 'pg';

type QueryParam = string | number | boolean | Date | null | Record<string, unknown>;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: QueryParam[]
): Promise<QueryResult<T>> {
  const start = Date.now();

  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error', { text, error });
    throw error;
  }
}

export function getClient() {
  return pool.connect();
}
