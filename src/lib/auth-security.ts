export const PASSWORD_MIN_LENGTH = 10;
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCKOUT_MINUTES = 15;

export function validatePasswordStrength(password: string) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`;
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number';
  }

  return null;
}

export function isUserLocked(lockedUntil: Date | string | null, now = new Date()) {
  if (!lockedUntil) {
    return false;
  }

  const expiry = lockedUntil instanceof Date ? lockedUntil : new Date(lockedUntil);
  return Number.isFinite(expiry.getTime()) && expiry.getTime() > now.getTime();
}

export function buildFailedLoginState(currentAttempts: number, now = new Date()) {
  const nextAttempts = currentAttempts + 1;

  if (nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    const lockedUntil = new Date(now.getTime() + ACCOUNT_LOCKOUT_MINUTES * 60 * 1000);

    return {
      failedLoginAttempts: 0,
      justLocked: true,
      lockedUntil,
    };
  }

  return {
    failedLoginAttempts: nextAttempts,
    justLocked: false,
    lockedUntil: null,
  };
}

export function getRemainingLockMinutes(lockedUntil: Date | string, now = new Date()) {
  const expiry = lockedUntil instanceof Date ? lockedUntil : new Date(lockedUntil);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.max(1, Math.ceil(diffMs / (60 * 1000)));
}
