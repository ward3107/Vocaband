import { useState } from 'react';
import { supabase } from '../../../core/supabase';
import type { BagrutModule, BagrutTest } from '../types';

export interface GenerateState {
  loading: boolean;
  error: string | null;
  test: BagrutTest | null;
  cached: boolean;
  model: string | null;
}

export function useBagrutGenerator() {
  const [state, setState] = useState<GenerateState>({
    loading: false,
    error: null,
    test: null,
    cached: false,
    model: null,
  });

  async function generate(module: BagrutModule, words: string[]): Promise<BagrutTest | null> {
    setState({ loading: true, error: null, test: null, cached: false, model: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({ loading: false, error: 'Not signed in', test: null, cached: false, model: null });
        return null;
      }
      const res = await fetch('/api/generate-bagrut', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ module, words }),
      });
      const body = await res.json();
      if (!res.ok) {
        setState({ loading: false, error: body.error || 'Generation failed', test: null, cached: false, model: null });
        return null;
      }
      setState({ loading: false, error: null, test: body.test, cached: !!body.cached, model: body.model ?? null });
      return body.test as BagrutTest;
    } catch (err: any) {
      setState({ loading: false, error: err?.message || 'Network error', test: null, cached: false, model: null });
      return null;
    }
  }

  function reset() {
    setState({ loading: false, error: null, test: null, cached: false, model: null });
  }

  return { ...state, generate, reset };
}
