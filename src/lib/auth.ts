import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

import { getRequiredEnv } from '@/lib/env';

export type AuthUser = {
  id: number;
  email: string;
};

export function getJwtSecret() {
  return getRequiredEnv('JWT_SECRET');
}

export function signAuthToken(user: AuthUser) {
  return jwt.sign(user, getJwtSecret(), { expiresIn: '1d' });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as AuthUser;
}

export async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) return null;

  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}
