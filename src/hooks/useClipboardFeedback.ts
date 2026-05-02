/**
 * Reusable hook for "copied to clipboard" feedback with auto-reset.
 * Replaces the duplicated pattern in 4+ components.
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export function useClipboardFeedback(feedbackMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Clear previous timer if exists
      if (timerRef.current) clearTimeout(timerRef.current);
      setCopied(true);
      timerRef.current = setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, feedbackMs);
      return true;
    } catch {
      return false;
    }
  }, [feedbackMs]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCopied(false);
    timerRef.current = null;
  }, []);

  return { copied, copyToClipboard, reset };
}
