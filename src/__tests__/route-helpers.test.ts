import bcrypt from 'bcryptjs';
import { afterEach, describe, expect, it } from 'vitest';

import {
  ACCOUNT_LOCKOUT_MINUTES,
  MAX_FAILED_LOGIN_ATTEMPTS,
  buildFailedLoginState,
  getRemainingLockMinutes,
  isUserLocked,
  validatePasswordStrength,
} from '@/lib/auth-security';
import {
  deriveAppId as deriveAppIdFromUtils,
  parseCsvImportText as parseCsvImportTextFromUtils,
  validateRecordInput as validateRecordInputFromUtils,
} from '@/lib/app-utils';
import { getJwtSecret, signAuthToken, verifyAuthToken } from '@/lib/auth';
import { assertSetupAllowed } from '@/lib/route-guards';
import type { ModelConfig } from '@/lib/config-parser';

const employeeModel: ModelConfig = {
  name: 'employees',
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'salary', type: 'number', required: false },
    { name: 'is_active', type: 'boolean', required: false },
    { name: 'start_date', type: 'date', required: false },
    { name: 'bio', type: 'text', required: false },
  ],
};

afterEach(() => {
  delete process.env.JWT_SECRET;
  delete process.env.SETUP_TOKEN;
  process.env.NODE_ENV = 'test';
});

describe('deriveAppId', () => {
  it('lowercases and hyphenates names', () => {
    expect(deriveAppIdFromUtils('My Cool App')).toBe('my-cool-app');
  });

  it('collapses special characters', () => {
    expect(deriveAppIdFromUtils('App@Name!')).toBe('app-name');
  });

  it('sanitizes override ids too', () => {
    expect(deriveAppIdFromUtils('Ignored', ' Custom Id ')).toBe('custom-id');
  });

  it('falls back to app when the slug is empty', () => {
    expect(deriveAppIdFromUtils('!!!')).toBe('app');
  });
});

describe('auth helpers', () => {
  it('throws when JWT_SECRET is missing', () => {
    expect(() => getJwtSecret()).toThrow('Missing required environment variable: JWT_SECRET');
  });

  it('signs and verifies a valid token', () => {
    process.env.JWT_SECRET = 'test-secret';

    const token = signAuthToken({ id: 1, email: 'test@example.com' });
    const decoded = verifyAuthToken(token);

    expect(decoded.id).toBe(1);
    expect(decoded.email).toBe('test@example.com');
  });

  it('rejects a tampered token', () => {
    process.env.JWT_SECRET = 'test-secret';

    const token = signAuthToken({ id: 1, email: 'test@example.com' });
    const tampered = `${token.slice(0, -5)}abcde`;

    expect(() => verifyAuthToken(tampered)).toThrow();
  });
});

describe('validateRecordInput', () => {
  it('coerces strings into typed record values', () => {
    const record = validateRecordInputFromUtils('employees', employeeModel, {
      name: 'Alice',
      salary: '50000',
      is_active: 'true',
      start_date: '2026-05-06',
      bio: 'Team lead',
    });

    expect(record).toEqual({
      name: 'Alice',
      salary: 50000,
      is_active: true,
      start_date: '2026-05-06',
      bio: 'Team lead',
    });
  });

  it('drops optional blank fields', () => {
    const record = validateRecordInputFromUtils('employees', employeeModel, {
      name: 'Alice',
      salary: '',
      bio: '',
    });

    expect(record).toEqual({ name: 'Alice' });
  });

  it('rejects unknown fields', () => {
    expect(() =>
      validateRecordInputFromUtils('employees', employeeModel, {
        name: 'Alice',
        role: 'Admin',
      })
    ).toThrow('Unknown field(s): role.');
  });
});

describe('parseCsvImportText', () => {
  it('parses and coerces valid CSV rows', () => {
    const rows = parseCsvImportTextFromUtils(
      'name,salary,is_active,start_date\nAlice,50000,true,2026-05-06\nBob,42000,false,2026-05-07',
      'employees',
      employeeModel
    );

    expect(rows).toEqual([
      { name: 'Alice', salary: 50000, is_active: true, start_date: '2026-05-06' },
      { name: 'Bob', salary: 42000, is_active: false, start_date: '2026-05-07' },
    ]);
  });

  it('reports row numbers for invalid data', () => {
    expect(() =>
      parseCsvImportTextFromUtils('name,salary\nAlice,not-a-number', 'employees', employeeModel)
    ).toThrow('Row 2: Field "salary" must be a valid number.');
  });

  it('rejects unknown CSV columns', () => {
    expect(() =>
      parseCsvImportTextFromUtils('name,role\nAlice,Admin', 'employees', employeeModel)
    ).toThrow('Row 2: Unknown field(s): role.');
  });
});

describe('auth security helpers', () => {
  it('rejects weak passwords', () => {
    expect(validatePasswordStrength('short')).toBe('Password must be at least 10 characters long');
    expect(validatePasswordStrength('alllowercase1')).toBe('Password must include at least one uppercase letter');
    expect(validatePasswordStrength('ALLUPPERCASE1')).toBe('Password must include at least one lowercase letter');
    expect(validatePasswordStrength('NoNumbersHere')).toBe('Password must include at least one number');
  });

  it('accepts strong passwords', () => {
    expect(validatePasswordStrength('StrongPass1')).toBeNull();
  });

  it('locks the account after the max number of failures', () => {
    const now = new Date('2026-05-06T10:00:00.000Z');
    const state = buildFailedLoginState(MAX_FAILED_LOGIN_ATTEMPTS - 1, now);

    expect(state.justLocked).toBe(true);
    expect(state.failedLoginAttempts).toBe(0);
    expect(state.lockedUntil?.toISOString()).toBe('2026-05-06T10:15:00.000Z');
  });

  it('increments the failed attempt count before lockout', () => {
    const state = buildFailedLoginState(2);

    expect(state.justLocked).toBe(false);
    expect(state.failedLoginAttempts).toBe(3);
    expect(state.lockedUntil).toBeNull();
  });

  it('detects active lockouts and remaining time', () => {
    const now = new Date('2026-05-06T10:00:00.000Z');
    const lockedUntil = new Date(now.getTime() + ACCOUNT_LOCKOUT_MINUTES * 60 * 1000);

    expect(isUserLocked(lockedUntil, now)).toBe(true);
    expect(getRemainingLockMinutes(lockedUntil, now)).toBe(ACCOUNT_LOCKOUT_MINUTES);
  });
});

describe('bcrypt flow', () => {
  it('hashes and verifies passwords correctly', async () => {
    const hash = await bcrypt.hash('mypassword', 10);
    const match = await bcrypt.compare('mypassword', hash);

    expect(match).toBe(true);
  });
});

describe('setup route guard', () => {
  it('allows production setup with the configured setup token', () => {
    process.env.NODE_ENV = 'production';
    process.env.SETUP_TOKEN = 'setup-secret';
    const req = new Request('https://example.com/api/setup', {
      headers: { 'x-setup-token': 'setup-secret' },
    });

    expect(assertSetupAllowed(req)).toBeNull();
  });

  it('blocks production setup without the token', () => {
    process.env.NODE_ENV = 'production';
    process.env.SETUP_TOKEN = 'setup-secret';
    const req = new Request('https://example.com/api/setup');

    expect(assertSetupAllowed(req)?.status).toBe(404);
  });
});
