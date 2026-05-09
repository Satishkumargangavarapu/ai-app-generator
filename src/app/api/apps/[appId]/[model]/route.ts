import { NextResponse } from 'next/server';

import { getModelConfig, validateRecordInput } from '@/lib/app-utils';
import { query } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { parseConfig, AppConfig } from '@/lib/config-parser';
import { createNotification } from '@/lib/notifications';

async function getAppConfig(appId: string): Promise<AppConfig | null> {
  const res = await query('SELECT config FROM apps WHERE id = $1', [appId]);
  if (!res.rowCount) return null;
  return parseConfig(res.rows[0].config);
}

type DynamicRecordRow = {
  id: number;
  data: Record<string, string | number | boolean>;
  created_at: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ appId: string; model: string }> }
) {
  try {
    const { appId, model } = await params;
    const config = await getAppConfig(appId);
    if (!config) return NextResponse.json({ error: 'App not found' }, { status: 404 });

    const modelSchema = getModelConfig(config, model);
    if (!modelSchema) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    let ownerId: number | null = null;
    let user = null;
    if (config.auth?.required) {
      user = await getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      ownerId = user.id;
    }

    const sqlParams: Array<string | number> = [appId, model];
    let sql = 'SELECT * FROM dynamic_records WHERE app_id = $1 AND model_name = $2';

    if (ownerId !== null) {
      sql += ' AND owner_id = $3';
      sqlParams.push(ownerId);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query<DynamicRecordRow>(sql, sqlParams);
    const records = result.rows.map((row) => ({
      ...row.data,
      _created_at: row.created_at,
      id: row.id,
    }));

    return NextResponse.json({ data: records });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ appId: string; model: string }> }
) {
  try {
    const { appId, model } = await params;
    const config = await getAppConfig(appId);
    if (!config) return NextResponse.json({ error: 'App not found' }, { status: 404 });

    const modelSchema = getModelConfig(config, model);
    if (!modelSchema) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    let ownerId: number | null = null;
    let user = null;
    if (config.auth?.required) {
      user = await getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      ownerId = user.id;
    }

    const payload = await req.json();
    const validatedPayload = validateRecordInput(model, modelSchema, payload);

    const result = await query<DynamicRecordRow>(
      'INSERT INTO dynamic_records (app_id, model_name, owner_id, data) VALUES ($1, $2, $3, $4) RETURNING *',
      [appId, model, ownerId, validatedPayload]
    );

    const record = result.rows[0];
    await createNotification(config, {
      appId,
      modelName: model,
      event: 'record.created',
      user,
      recordId: record.id,
    });

    return NextResponse.json({ data: { id: record.id, ...record.data } }, { status: 201 });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ appId: string; model: string }> }
) {
  try {
    const { appId, model } = await params;
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const config = await getAppConfig(appId);
    if (!config) return NextResponse.json({ error: 'App not found' }, { status: 404 });

    const modelSchema = getModelConfig(config, model);
    if (!modelSchema) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    let ownerId: number | null = null;
    let user = null;
    if (config.auth?.required) {
      user = await getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      ownerId = user.id;
    }

    const payload = await req.json();
    const validatedPayload = validateRecordInput(model, modelSchema, payload);
    const sqlParams: Array<string | number | Record<string, string | number | boolean>> = [
      validatedPayload,
      id,
      appId,
      model,
    ];
    let sql =
      'UPDATE dynamic_records SET data = $1 WHERE id = $2 AND app_id = $3 AND model_name = $4';

    if (ownerId !== null) {
      sql += ' AND owner_id = $5';
      sqlParams.push(ownerId);
    }

    sql += ' RETURNING *';

    const result = await query<DynamicRecordRow>(sql, sqlParams);
    if (!result.rowCount) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
    }

    const record = result.rows[0];
    await createNotification(config, {
      appId,
      modelName: model,
      event: 'record.updated',
      user,
      recordId: record.id,
    });

    return NextResponse.json({ data: { id: record.id, ...record.data } });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ appId: string; model: string }> }
) {
  try {
    const { appId, model } = await params;
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const config = await getAppConfig(appId);
    if (!config) return NextResponse.json({ error: 'App not found' }, { status: 404 });

    const modelSchema = getModelConfig(config, model);
    if (!modelSchema) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    let ownerId: number | null = null;
    let user = null;
    if (config.auth?.required) {
      user = await getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      ownerId = user.id;
    }

    const sqlParams: Array<string | number> = [id, appId, model];
    let sql = 'DELETE FROM dynamic_records WHERE id = $1 AND app_id = $2 AND model_name = $3';

    if (ownerId !== null) {
      sql += ' AND owner_id = $4';
      sqlParams.push(ownerId);
    }

    const result = await query(sql, sqlParams);

    if (!result.rowCount) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
    }

    await createNotification(config, {
      appId,
      modelName: model,
      event: 'record.deleted',
      user,
      recordId: Number(id),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
