import { NextResponse } from 'next/server';

export function assertSetupAllowed(req?: Request) {
  if (process.env.NODE_ENV === 'production') {
    const setupToken = process.env.SETUP_TOKEN;
    const providedToken = req?.headers.get('x-setup-token');

    if (setupToken && providedToken === setupToken) {
      return null;
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return null;
}
