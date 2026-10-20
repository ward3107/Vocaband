import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBackLayer } from '../hooks/useBackLayer';
import { modalBackStack } from '../utils/modalBackStack';
import { useState } from 'react';
import { BackLayerContext } from '../hooks/BackLayerContext';

afterEach(() => {
  cleanup();
  expect(modalBackStack.size).toBe(0);
});

describe('visible Back layers', () => {
  it('closes a nested dialog before its parent despite child-first effects', () => {
    const parent = vi.fn();
    const child = vi.fn();
    function Child({ onClose }: { onClose: () => void }) {
      useBackLayer(onClose, { priority: 110 });
      return null;
    }
    function Parent() {
      const [open, setOpen] = useState(true);
      useBackLayer(parent, { priority: 100 });
      return open ? (
        <Child
          onClose={() => {
            child();
            setOpen(false);
          }}
        />
      ) : null;
    }
    render(<Parent />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(child).toHaveBeenCalledOnce();
    expect(parent).not.toHaveBeenCalled();
    act(() => {
      modalBackStack.closeTop();
    });
    expect(parent).toHaveBeenCalledOnce();
  });

  it('consumes repeated Back while a request or confirmation owns the screen', () => {
    const busy = vi.fn(() => false as const);
    const { rerender, unmount } = renderHook(({ enabled }) => useBackLayer(busy, { enabled }), {
      initialProps: { enabled: true },
    });
    act(() => {
      modalBackStack.closeTop();
      modalBackStack.closeTop();
    });
    expect(busy).toHaveBeenCalledTimes(2);
    expect(modalBackStack.size).toBe(1);
    rerender({ enabled: false });
    expect(modalBackStack.size).toBe(0);
    unmount();
  });

  it('uses the latest action without moving a layer above a newer dialog', () => {
    const old = vi.fn();
    const latest = vi.fn();
    const top = vi.fn();
    const { rerender } = renderHook(({ action }) => useBackLayer(action, { priority: 50 }), {
      initialProps: { action: old },
    });
    const newer = renderHook(() => useBackLayer(top, { priority: 50 }));
    rerender({ action: latest });
    act(() => {
      modalBackStack.closeTop();
    });
    newer.unmount();
    act(() => {
      modalBackStack.closeTop();
    });
    expect(top).toHaveBeenCalledOnce();
    expect(latest).toHaveBeenCalledOnce();
    expect(old).not.toHaveBeenCalled();
  });
  it('retains a required dialog whose close action deliberately does nothing', () => {
    const required = vi.fn();
    const below = vi.fn();
    renderHook(() => useBackLayer(below, { priority: 50 }));
    renderHook(() => useBackLayer(required, { priority: 100 }));
    act(() => {
      modalBackStack.closeTop();
      modalBackStack.closeTop();
    });
    expect(required).toHaveBeenCalledTimes(2);
    expect(below).not.toHaveBeenCalled();
  });
  it('respects a nested stacking context when the child has a lower CSS z-index', () => {
    const parent = vi.fn();
    const child = vi.fn();
    function Child() {
      useBackLayer(child, { priority: 50 });
      return null;
    }
    function Parent() {
      const priority = useBackLayer(parent, { priority: 95 });
      return (
        <BackLayerContext.Provider value={priority}>
          <Child />
        </BackLayerContext.Provider>
      );
    }
    render(<Parent />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(child).toHaveBeenCalledOnce();
    expect(parent).not.toHaveBeenCalled();
  });
});
