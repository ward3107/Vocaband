// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Suppress React error boundary console output during tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// A component that always throws
function ThrowingChild({ message }: { message: string }) {
  throw new Error(message);
}

// A component that renders normally
function GoodChild() {
  return <div>All is well</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('All is well')).toBeDefined();
  });

  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="Test crash" />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong.')).toBeDefined();
  });

  it('shows a refresh button in the fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="Test crash" />
      </ErrorBoundary>
    );
    expect(screen.getByText('Refresh Page')).toBeDefined();
  });

  it('shows helpful instructions in the fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild message="Test crash" />
      </ErrorBoundary>
    );
    expect(screen.getByText(/refresh the page and try again/i)).toBeDefined();
  });
});
