import { notFound } from 'next/navigation';

import { DynamicAppRuntime } from '@/components/DynamicAppRuntime';
import { parseConfig, AppConfig } from '@/lib/config-parser';
import { query } from '@/lib/db';

async function getAppConfig(appId: string): Promise<AppConfig | null> {
  const res = await query('SELECT config FROM apps WHERE id = $1', [appId]);
  if (!res.rowCount) return null;
  return parseConfig(res.rows[0].config);
}

export default async function DynamicAppPage(
  { params }: { params: Promise<{ appId: string; viewPath?: string[] }> }
) {
  const { appId, viewPath } = await params;
  const config = await getAppConfig(appId);

  if (!config) return notFound();

  const path = viewPath ? `/${viewPath.join('/')}` : '/';

  return <DynamicAppRuntime appId={appId} config={config} path={path} />;
}
