import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUser();
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
