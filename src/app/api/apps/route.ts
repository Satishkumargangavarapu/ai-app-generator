import { NextResponse } from 'next/server';

import { deriveAppId, getModelConfig, validateRecordInput } from '@/lib/app-utils';
import { getUser } from '@/lib/auth';
import { getClient, query } from '@/lib/db';
import { parseConfig } from '@/lib/config-parser';

type AppListRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

async function getAvailableAppId(baseId: string) {
  let candidate = baseId;
  let suffix = 2;

  while (true) {
    const existing = await query('SELECT id FROM apps WHERE id = $1', [candidate]);
    if (!existing.rowCount) {
      return candidate;
    }

    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }
}

export async function GET() {
  try {
    const user = await getUser();
    const result = user
      ? await query<AppListRow>(
          'SELECT id, name, created_at, updated_at FROM apps WHERE owner_id = $1 OR owner_id IS NULL ORDER BY created_at DESC',
          [user.id]
        )
      : await query<AppListRow>(
          'SELECT id, name, created_at, updated_at FROM apps WHERE owner_id IS NULL ORDER BY created_at DESC'
        );
    return NextResponse.json({ apps: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const client = await getClient();

  try {
    const payload = (await req.json()) as { config?: unknown; id?: string };
    const config = parseConfig(payload.config);
    const requestedId = deriveAppId(config.name, payload.id);
    const id = await getAvailableAppId(requestedId);
    const user = await getUser();

    await client.query('BEGIN');

    const result = await client.query(
      'INSERT INTO apps (id, name, config, owner_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, config.name, JSON.stringify(config), user?.id ?? null]
    );

    for (const [modelName, rows] of Object.entries(config.seedData ?? {})) {
      const modelConfig = getModelConfig(config, modelName);
      if (!modelConfig) {
        throw new Error(`Seed data references unknown model "${modelName}".`);
      }

      for (const row of rows) {
        const validatedRow = validateRecordInput(modelName, modelConfig, row);
        await client.query(
          'INSERT INTO dynamic_records (app_id, model_name, owner_id, data) VALUES ($1, $2, $3, $4)',
          [id, modelName, null, validatedRow]
        );
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({ app: result.rows[0] }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    const message = error instanceof Error ? error.message : 'Invalid configuration or internal error';
    return NextResponse.json({ error: message }, { status: 400 });
  } finally {
    client.release();
  }
}
