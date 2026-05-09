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
    return NextResponse.json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
