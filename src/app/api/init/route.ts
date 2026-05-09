import { NextResponse } from 'next/server';

import { initDb } from '@/lib/initDb';
import { assertSetupAllowed } from '@/lib/route-guards';

export async function GET(req: Request) {
  const disallowedResponse = assertSetupAllowed(req);
  if (disallowedResponse) {
    return disallowedResponse;
  }

  try {
    await initDb();
    return NextResponse.json({ success: true, message: 'Database initialized' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Init error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
