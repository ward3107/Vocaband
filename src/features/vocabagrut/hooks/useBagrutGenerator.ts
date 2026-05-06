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
      // Sniff the response type before parsing.  When the Fly.io backend
      // hasn't been redeployed with the new endpoint, the request falls
      // through to the SPA index.html — calling res.json() on that throws
      // a useless "Unexpected token <" error.  Detect the HTML case and
      // surface a deploy-pointing message instead.
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const sample = (await res.text()).slice(0, 80).replace(/\s+/g, ' ');
        const msg = res.status === 404 || ct.includes('text/html')
          ? 'The Vocabagrut endpoint is not reachable. Make sure the Fly.io backend has been redeployed with the new /api/generate-bagrut route.'
          : `Unexpected response (${res.status}): ${sample}`;
        setState({ loading: false, error: msg, test: null, cached: false, model: null });
        return null;
      }
      const body = await res.json();
      if (!res.ok) {
        setState({ loading: false, error: body.error || `Generation failed (HTTP ${res.status})`, test: null, cached: false, model: null });
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
