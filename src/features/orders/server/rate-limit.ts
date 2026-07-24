import "server-only";

type Attempt = { count: number; resetAt: number };

const globalRateLimits = globalThis as typeof globalThis & {
  __foodappLoginAttempts?: Map<string, Attempt>;
};

const attempts =
  globalRateLimits.__foodappLoginAttempts ??
  (globalRateLimits.__foodappLoginAttempts = new Map());

export function checkLoginRateLimit(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= 5) {
    return {
      allowed: false,
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
    };
  }
  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export function clearLoginRateLimit(key: string) {
  attempts.delete(key);
}
