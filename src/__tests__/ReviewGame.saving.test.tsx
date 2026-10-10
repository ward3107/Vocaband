import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Word } from '../data/vocabulary';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), abortSignal: vi.fn() }));
vi.mock('../core/supabase', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('../hooks/useLanguage', () => ({ useLanguage: () => ({ language: 'en', dir: 'ltr' }) }));
vi.mock('../hooks/useVocabularyLazy', () => ({ useVocabularyLazy: () => null }));
import ReviewGame from '../components/game/ReviewGame';
const words = [
  { id: 1, english: 'apple', hebrew: 'תפוח', arabic: 'تفاحة' },
  { id: 2, english: 'book', hebrew: 'ספר', arabic: 'كتاب' },
] as Word[];

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.rpc.mockImplementation((name: string) => name === 'get_due_reviews'
    ? Promise.resolve({ data: [{ word_id: 1 }], error: null })
    : { abortSignal: mocks.abortSignal });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('review result saving', () => {
  it('surfaces returned RPC errors and requires acknowledgement before results', async () => {
    mocks.abortSignal.mockResolvedValue({ error: { message: 'offline' } });
    const onFinish = vi.fn();
    await act(async () => { render(<ReviewGame allWords={words} themeColor="violet" targetLanguage="hebrew" speak={vi.fn()} onFinish={onFinish} />); });
    await act(async () => { fireEvent.click(screen.getByText('תפוח')); });
    await act(async () => { vi.advanceTimersByTime(700); });
    expect(onFinish).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('couldn’t confirm');
    fireEvent.click(screen.getByRole('button', { name: 'Continue to results' }));
    expect(onFinish).toHaveBeenCalledWith(1, 1);
    expect(mocks.rpc.mock.calls.filter(([name]) => name === 'record_review_result')).toHaveLength(1);
  });
  it('waits for a delayed save before finishing', async () => {
    let saved!: (value: unknown) => void;
    mocks.abortSignal.mockReturnValue(new Promise(resolve => { saved = resolve; }));
    const onFinish = vi.fn();
    await act(async () => { render(<ReviewGame allWords={words} themeColor="violet" targetLanguage="hebrew" speak={vi.fn()} onFinish={onFinish} />); });
    await act(async () => { fireEvent.click(screen.getByText('תפוח')); vi.advanceTimersByTime(700); });
    expect(onFinish).not.toHaveBeenCalled();
    await act(async () => saved({ error: null }));
    expect(onFinish).toHaveBeenCalledWith(1, 1);
  });
});
