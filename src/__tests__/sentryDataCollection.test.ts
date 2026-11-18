import { describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/react';
import { clearSentryUser, initSentry, setSentryUser } from '../core/sentry';

vi.mock('@sentry/react', () => ({ init: vi.fn(), setUser: vi.fn() }));

describe('browser error reporting', () => {
  it('opts out of collecting classroom request content and identity automatically', () => {
    initSentry();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: { request: { allow: ['user-agent'] }, response: false },
          httpBodies: [],
          urlQueryParams: false,
          graphQL: { document: false, variables: false },
          genAI: { inputs: false, outputs: false },
          mcp: { inputs: false, outputs: false },
          databaseQueryData: false,
          queues: false,
          stackFrameVariables: false,
        },
      })
    );
  });

  it('attaches only the opaque account ID and clears it on logout', () => {
    setSentryUser('synthetic-account-id');
    clearSentryUser();
    expect(vi.mocked(Sentry.setUser).mock.calls).toEqual([
      [{ id: 'synthetic-account-id' }],
      [null],
    ]);
  });
});
