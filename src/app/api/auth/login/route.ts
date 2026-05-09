import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import {
  buildFailedLoginState,
  getRemainingLockMinutes,
  isUserLocked,
} from '@/lib/auth-security';
import { signAuthToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { ensureDbReady } from '@/lib/initDb';

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  failed_login_attempts: number;
  locked_until: string | null;
};

export async function POST(req: Request) {
  try {
    await ensureDbReady();

    const payload = (await req.json()) as { email?: string; password?: string };
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const result = await query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rowCount || result.rowCount === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = result.rows[0];

    if (isUserLocked(user.locked_until)) {
      const minutes = getRemainingLockMinutes(user.locked_until as string);
      return NextResponse.json(
        { error: `Too many failed login attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` },
        { status: 429 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      const failedState = buildFailedLoginState(user.failed_login_attempts);

      await query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
        [failedState.failedLoginAttempts, failedState.lockedUntil, user.id]
      );

      if (failedState.justLocked) {
        return NextResponse.json(
          { error: 'Too many failed login attempts. Your account has been temporarily locked for 15 minutes.' },
          { status: 429 }
        );
      }

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    await query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    const token = signAuthToken({ id: user.id, email: user.email });

    const response = NextResponse.json({ user: { id: user.id, email: user.email } });

    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
