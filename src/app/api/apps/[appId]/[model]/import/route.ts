import { NextResponse } from 'next/server';

import { getModelConfig, parseCsvImportText } from '@/lib/app-utils';
import { getClient, query } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { parseConfig, AppConfig } from '@/lib/config-parser';
import { createNotification } from '@/lib/notifications';

async function getAppConfig(appId: string): Promise<AppConfig | null> {
  const res = await query('SELECT config FROM apps WHERE id = $1', [appId]);
  if (!res.rowCount) return null;
  return parseConfig(res.rows[0].config);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ appId: string; model: string }> }
) {
  try {
    const { appId, model } = await params;
    const config = await getAppConfig(appId);
    if (!config) return NextResponse.json({ error: 'App not found' }, { status: 404 });

    const modelConfig = getModelConfig(config, model);
    if (!modelConfig) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    let ownerId: number | null = null;
    let user = null;
    if (config.auth?.required) {
      user = await getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      ownerId = user.id;
    }

    const text = await req.text();
    const rows = parseCsvImportText(text, model, modelConfig);
    const client = await getClient();

    try {
      await client.query('BEGIN');
      for (const row of rows) {
        await client.query(
          'INSERT INTO dynamic_records (app_id, model_name, owner_id, data) VALUES ($1, $2, $3, $4)',
          [appId, model, ownerId, row]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await createNotification(config, {
      appId,
      modelName: model,
      event: 'csv.imported',
      user,
      count: rows.length,
    });

    return NextResponse.json({ success: true, count: rows.length }, { status: 201 });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
