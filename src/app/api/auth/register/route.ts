import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { validatePasswordStrength } from '@/lib/auth-security';
import { query } from '@/lib/db';
import { ensureDbReady } from '@/lib/initDb';

export async function POST(req: Request) {
  try {
    await ensureDbReady();

    const payload = (await req.json()) as { email?: string; password?: string };
    const email = payload.email?.trim().toLowerCase();
    const password = payload.password;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rowCount && existingUser.rowCount > 0) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hash]
    );

    return NextResponse.json({ user: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
