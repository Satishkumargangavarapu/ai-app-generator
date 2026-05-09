import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth';
import { query } from '@/lib/db';

type NotificationRow = {
  id: number;
  event: string;
  title: string;
  message: string;
  read_at: string | null;
  mock_email_sent: boolean;
  created_at: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    const user = await getUser();

    const result = await query<NotificationRow>(
      `SELECT id, event, title, message, read_at, mock_email_sent, created_at
       FROM notifications
       WHERE app_id = $1 AND (user_id IS NULL OR user_id = $2)
       ORDER BY created_at DESC
       LIMIT 20`,
      [appId, user?.id ?? null]
    );

    return NextResponse.json({ notifications: result.rows });
  } catch (error) {
    console.error('Notification list error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    const payload = (await req.json()) as { id?: number };

    if (!payload.id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const user = await getUser();
    const result = await query(
      `UPDATE notifications
       SET read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND app_id = $2 AND (user_id IS NULL OR user_id = $3)`,
      [payload.id, appId, user?.id ?? null]
    );

    if (!result.rowCount) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
