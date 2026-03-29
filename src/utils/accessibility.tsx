/**
 * Accessibility Utilities for WCAG 2.0 AA / IS 5568 Compliance
 *
 * This file provides reusable components and utilities for accessibility
 */

import React from 'react';

/**
 * Screen reader only text - visually hidden but accessible to assistive technology
 * Usage: <VisuallyHidden>Skip to main content</VisuallyHidden>
 */
export const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="sr-only">
    {children}
  </span>
);

/**
 * Skip link component for 2.4.1 - Bypass Blocks
 * Add as first element inside <body> in index.html
 */
export const SkipLinks: React.FC = () => (
  <>
    <a
      href="#main-content"
      className="fixed left-0 top-0 z-[9999] bg-black text-white px-4 py-3 -translate-y-full focus:translate-y-0 transition-transform"
    >
      Skip to main content
    </a>
    <a
      href="#navigation"
      className="fixed left-0 top-10 z-[9999] bg-black text-white px-4 py-3 -translate-y-full focus:translate-y-0 transition-transform"
    >
      Skip to navigation
    </a>
  </>
);

/**
 * Focus outline styles for 2.4.7 - Focus Visible
 * Add to global CSS
 */
export const focusVisibleStyles = `
  /* Focus visible indicator for keyboard navigation */
  *:focus-visible {
    outline: 3px solid #0050d4;
    outline-offset: 3px;
  }

  /* Remove default outline only when mouse is used */
  *:focus:not(:focus-visible) {
    outline: none;
  }

  /* Ensure focus indicator on all interactive elements */
  button:focus-visible,
  a:focus-visible,
  [role="button"]:focus-visible,
  [role="link"]:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 3px solid #0050d4;
    outline-offset: 3px;
  }
`;

/**
 * ARIA live region for announcements
 * Usage for dynamic content changes that need to be announced
 */
export const LiveRegion: React.FC<{
  children: React.ReactNode;
  role?: 'status' | 'alert';
  'aria-live'?: 'polite' | 'assertive';
  'aria-atomic'?: boolean;
}> = ({ children, role = 'status', 'aria-live' = 'polite', 'aria-atomic' = true }) => (
  <div role={role} aria-live={aria-live} aria-atomic={aria-atomic} className="sr-only">
    {children}
  </div>
);

/**
 * Heading level normalization
 * Wraps content in semantically correct heading level
 */
export const Heading: React.FC<{
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
}> = ({ level, children, className = '' }) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return <Tag className={className}>{children}</Tag>;
};

/**
 * Accessible button props
 * Ensures proper keyboard and screen reader support
 */
export const getAccessibleButtonProps = (label: string, pressed?: boolean) => ({
  role: 'button',
  'aria-pressed': pressed ? 'true' : undefined,
  'aria-label': label,
  tabIndex: 0,
  onKeyDown: (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      (e.target as HTMLElement).click();
    }
  },
});

/**
 * Form field wrapper with proper label association
 */
export const FormField: React.FC<{
  label: string;
  error?: string;
  required?: boolean;
  children: (props: { id: string; 'aria-describedby'?: string }) => React.ReactNode;
}> = ({ label, error, required, children }) => {
  const fieldId = React.useId();
  const errorId = `${fieldId}-error`;

  return (
    <div className="form-field">
      <label htmlFor={fieldId} className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-600 ml-1" aria-label="required">*</span>}
      </label>
      {children({ id: fieldId, 'aria-describedby': error ? errorId : undefined })}
      {error && (
        <p id={errorId} className="text-sm text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
