// server-utils.ts
// Pure validation and rate-limiting utilities used by the Socket.IO server.
// Extracted so they can be unit-tested independently of Express / Socket.IO.

// ─── Validation constants ───────────────────────────────────────────────────

export const VALIDATION = {
  CLASS_CODE_MIN: 1,
  CLASS_CODE_MAX: 64,
  NAME_MIN: 1,
  NAME_MAX: 100,
  UID_MIN: 1,
  UID_MAX: 128,
} as const;

// ─── Validation functions ───────────────────────────────────────────────────

/** Class codes: 1-64 alphanumeric characters (hyphens/underscores allowed). */
export function isValidClassCode(code: unknown): code is string {
  return typeof code === "string"
    && code.length >= VALIDATION.CLASS_CODE_MIN
    && code.length <= VALIDATION.CLASS_CODE_MAX
    && /^[A-Za-z0-9_-]+$/.test(code);
}

export function isValidName(value: unknown): value is string {
  return typeof value === "string" && value.length >= VALIDATION.NAME_MIN && value.length <= VALIDATION.NAME_MAX
    && !/[\x00-\x1f]/.test(value); // Reject control characters
}

/** UIDs must be valid UUID v4 format (36 hex chars + hyphens). */
export function isValidUid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Tokens must look like a JWT (three base64url segments separated by dots). */
export function isValidToken(value: unknown): value is string {
  return typeof value === "string"
    && value.length >= 20
    && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

// ─── Rate limiter ───────────────────────────────────────────────────────────

export function createSocketRateLimiter(windowMs: number, maxAttempts: number, cleanupIntervalMs: number) {
  const records: Record<string, { count: number; resetAt: number }> = {};

  // Lazy cleanup function - removes expired entries
  const cleanup = () => {
    const now = Date.now();
    let cleaned = 0;
    for (const [ip, record] of Object.entries(records)) {
      if (now >= record.resetAt) {
        delete records[ip];
        cleaned++;
      }
    }
    return cleaned;
  };

  // Periodic cleanup to prevent unbounded memory growth
  const intervalId = setInterval(cleanup, cleanupIntervalMs);

  // Check if IP can proceed (returns true if allowed, false if rate limited)
  const checkLimit = (ip: string): boolean => {
    const now = Date.now();
    const record = records[ip];

    if (record && now < record.resetAt) {
      // Within window - check count
      if (record.count >= maxAttempts) {
        return false; // Rate limited
      }
      record.count++;
      return true;
    }

    // New window or expired - create new record
    records[ip] = { count: 1, resetAt: now + windowMs };
    return true;
  };

  // Shutdown cleanup
  const shutdown = () => {
    clearInterval(intervalId);
    // Clear all records
    for (const ip of Object.keys(records)) {
      delete records[ip];
    }
  };

  return { checkLimit, cleanup, shutdown, records };
}
