/**
 * Simple error tracking utility for monitoring silent failures
 *
 * This helps track issues that don't show to users but need monitoring:
 * - Background sync failures (consent logging, profile upserts)
 * - Non-critical feature failures (OCR, translation)
 * - Data persistence issues (score saving, badge updates)
 */

type ErrorSeverity = 'low' | 'medium' | 'high';
type ErrorCategory = 'database' | 'network' | 'authentication' | 'feature' | 'other';

interface TrackedError {
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  timestamp: number;
}

// In a production app, this would send to a monitoring service
// For now, we'll use sessionStorage for the current session
const MAX_STORED_ERRORS = 50;

function getStoredErrors(): TrackedError[] {
  try {
    const stored = sessionStorage.getItem('vocaband_errors');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveErrors(errors: TrackedError[]) {
  try {
    sessionStorage.setItem('vocaband_errors', JSON.stringify(errors));
  } catch {
    // SessionStorage unavailable - silently fail
  }
}

function trimErrors(errors: TrackedError[]): TrackedError[] {
  // Keep only the most recent errors
  return errors.slice(-MAX_STORED_ERRORS);
}

/**
 * Track an error for monitoring purposes
 * @param message - Human-readable error description
 * @param category - Type of error
 * @param severity - Impact level
 * @param context - Additional debugging info
 */
export function trackError(
  message: string,
  category: ErrorCategory = 'other',
  severity: ErrorSeverity = 'medium',
  context?: Record<string, unknown>
): void {
  // Always log to console for debugging
  const logMessage = `[${severity.toUpperCase()}] ${message}`;
  if (severity === 'high') {
    console.error(logMessage, context);
  } else {
    console.warn(logMessage, context);
  }

  // Store in session for potential review
  const errors = getStoredErrors();
  errors.push({
    message,
    category,
    severity,
    context,
    timestamp: Date.now(),
  });
  saveErrors(trimErrors(errors));
}

/**
 * Get all tracked errors from the current session
 */
export function getTrackedErrors(): TrackedError[] {
  return getStoredErrors();
}

/**
 * Clear tracked errors (useful for testing)
 */
export function clearTrackedErrors(): void {
  sessionStorage.removeItem('vocaband_errors');
}

/**
 * Track error with automatic categorization
 * Convenience wrapper that detects category from error object
 */
export function trackAutoError(
  error: Error | unknown,
  message: string,
  context?: Record<string, unknown>
): void {
  let category: ErrorCategory = 'other';
  let severity: ErrorSeverity = 'medium';

  // Auto-detect category from error details
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
      category = 'network';
    } else if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('permission')) {
      category = 'authentication';
      severity = 'high';
    } else if (msg.includes('database') || msg.includes('supabase') || msg.includes('rpc')) {
      category = 'database';
    }
  }

  trackError(message, category, severity, { ...context, error });
}
