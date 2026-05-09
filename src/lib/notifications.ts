import { query } from '@/lib/db';
import type { AppConfig, NotificationEvent } from '@/lib/config-parser';
import type { AuthUser } from '@/lib/auth';

type NotificationPayload = {
  appId: string;
  modelName: string;
  event: NotificationEvent;
  user: AuthUser | null;
  recordId?: number;
  count?: number;
};

const EVENT_LABELS: Record<NotificationEvent, string> = {
  'record.created': 'Record created',
  'record.updated': 'Record updated',
  'record.deleted': 'Record deleted',
  'csv.imported': 'CSV imported',
};

export function shouldNotify(config: AppConfig, event: NotificationEvent) {
  return Boolean(config.notifications?.enabled && config.notifications.events.includes(event));
}

export async function createNotification(config: AppConfig, payload: NotificationPayload) {
  if (!shouldNotify(config, payload.event)) {
    return;
  }

  const title = EVENT_LABELS[payload.event];
  const message =
    payload.event === 'csv.imported'
      ? `${payload.count ?? 0} row${payload.count === 1 ? '' : 's'} imported into ${payload.modelName}.`
      : `${title} in ${payload.modelName}${payload.recordId ? ` #${payload.recordId}` : ''}.`;

  await query(
    `INSERT INTO notifications (app_id, user_id, event, title, message, mock_email_sent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      payload.appId,
      payload.user?.id ?? null,
      payload.event,
      title,
      message,
      config.notifications?.mockEmail === true,
    ]
  );
}
