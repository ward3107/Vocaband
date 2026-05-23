/**
 * AI Lesson generator — POSTs the picked vocabulary + reading-config to
 * the `/api/ai-generate-lesson` Fly endpoint and returns the parsed
 * lesson JSON.  Surfaces the Pro paywall via the supplied callback
 * when the server replies 403 / `ai_requires_pro`.
 *
 * Pulled out of App.tsx so the network call + auth handshake live next
 * to the other AI helpers (generateAndStoreQuickPlayAiSentences,
 * translate, OCR) rather than inside the 4k-line orchestrator.
 */
import { supabase } from '../core/supabase';

export interface AiLessonParams {
  words: Array<{ english: string; hebrew: string; arabic: string }>;
  config: {
    textDifficulty: string;
    textType: string;
    wordCount: number;
    questionTypes: {
      yesNo: number;
      wh: number;
      literal: number;
      inferential: number;
      fillBlank: number;
      trueFalse: number;
      matching: number;
      multipleChoice: number;
      sentenceComplete: number;
    };
    includeAnswers: boolean;
  };
}

export interface AiLessonDeps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  showPaywallToast: (msg: string) => void;
}

export interface AiLessonResponse {
  text: string;
  wordCount: number;
  questions: Array<{
    type: string;
    question: string;
    answer: string;
    options?: string[];
  }>;
  /** Vocab words from the input that Gemini failed to use in the
   *  generated text.  Server logs this and surfaces it so the client
   *  can warn the teacher to regenerate.  Empty array on success. */
  missingWords?: string[];
}

export async function generateAiLesson(
  params: AiLessonParams,
  deps: AiLessonDeps,
): Promise<AiLessonResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    deps.showToast('Authentication required', 'error');
    throw new Error('No auth token');
  }

  const response = await fetch('/api/ai-generate-lesson', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const isPaywall = response.status === 403 && error.error === 'ai_requires_pro';
    const msg = error.message || error.error || 'AI lesson generation failed';
    if (isPaywall) deps.showPaywallToast(msg);
    throw new Error(msg);
  }

  return await response.json();
}
