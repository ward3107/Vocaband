// Client call for the editor's "Add question" AI path.  Asks the backend to
// write ONE complete, on-context question (prompt + options + correct answer
// + answer-key note) so the teacher gets a finished, editable question
// instead of a blank.  Mirrors useBagrutGenerator's HTML-fallback sniff:
// when the Fly.io backend hasn't been redeployed with the new route, the
// request falls through to the SPA index.html and res.json() would throw a
// useless "Unexpected token <" — we detect that and surface a clear message.

import { supabase } from '../../../core/supabase';
import type { BagrutModule, BagrutQuestion, BagrutQuestionType, BagrutSectionKind } from '../types';

export interface SuggestQuestionArgs {
  module: BagrutModule;
  kind: BagrutSectionKind;
  type: BagrutQuestionType;
  passage?: string;
  words: string[];
  existingPrompts: string[];
  title?: string;
}

export interface SuggestQuestionResult {
  question: BagrutQuestion | null;
  error: string | null;
}

export async function suggestBagrutQuestion(args: SuggestQuestionArgs): Promise<SuggestQuestionResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { question: null, error: 'Not signed in' };

    const res = await fetch('/api/suggest-bagrut-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        module: args.module,
        kind: args.kind,
        type: args.type,
        passage: args.passage,
        words: args.words,
        existing_prompts: args.existingPrompts,
        title: args.title,
      }),
    });

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      const sample = (await res.text()).slice(0, 80).replace(/\s+/g, ' ');
      const msg = res.status === 404 || ct.includes('text/html')
        ? 'The Vocabagrut endpoint is not reachable. Make sure the Fly.io backend has been redeployed with the new /api/suggest-bagrut-question route.'
        : `Unexpected response (${res.status}): ${sample}`;
      return { question: null, error: msg };
    }

    const body = await res.json();
    if (!res.ok) {
      return { question: null, error: body.error || `Generation failed (HTTP ${res.status})` };
    }
    return { question: (body.question as BagrutQuestion) ?? null, error: null };
  } catch (err: any) {
    return { question: null, error: err?.message || 'Network error' };
  }
}
