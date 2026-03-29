import React from 'react';

/**
 * Main landmark component for WCAG 2.0 AA compliance
 * Wraps the main content of each page with proper semantic HTML
 *
 * Usage:
 * <Main landmark="student-dashboard">
 *   <h1>Page Title</h1>
 *   {/* page content */}
 * </Main>
 */
interface MainProps {
  children: React.ReactNode;
  /** Unique identifier for this landmark region */
  landmark?: string;
  /** Optional additional className */
  className?: string;
}

export const Main: React.FC<MainProps> = ({ children, landmark, className = '' }) => {
  return (
    <main
      id="main-content"
      role="main"
      className={className}
      aria-label={landmark ? `${landmark} main content` : 'Main content'}
    >
      {children}
    </main>
  );
};

/**
 * Navigation landmark component
 * Wraps navigation sections for better semantic structure
 */
interface NavProps {
  children: React.ReactNode;
  /** Optional label for the navigation */
  ariaLabel?: string;
  /** Optional additional className */
  className?: string;
}

export const Nav: React.FC<NavProps> = ({ children, ariaLabel = 'Main navigation', className = '' }) => {
  return (
    <nav
      id="navigation"
      role="navigation"
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </nav>
  );
};

/**
 * Section landmark component
 * Wraps content sections with proper semantics
 */
interface SectionProps {
  children: React.ReactNode;
  /** Section label for accessibility */
  ariaLabel?: string;
  /** Optional additional className */
  className?: string;
}

export const Section: React.FC<SectionProps> = ({ children, ariaLabel, className = '' }) => {
  return (
    <section
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </section>
  );
};

/**
 * Article landmark component for standalone content
 */
interface ArticleProps {
  children: React.ReactNode;
  /** Article title for accessibility */
  ariaLabel?: string;
  /** Optional additional className */
  className?: string;
}

export const Article: React.FC<ArticleProps> = ({ children, ariaLabel, className = '' }) => {
  return (
    <article
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </article>
  );
};

/**
 * Heading with proper level enforcement
 * Helps ensure proper heading hierarchy (1.3.1)
 */
interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
}

export const Heading: React.FC<HeadingProps> = ({ level, children, className = '' }) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return (
    <Tag className={className}>
      {children}
    </Tag>
  );
};

/**
 * Accessible button with proper keyboard support
 * Ensures all interactive elements are keyboard accessible (2.1.1)
 */
interface AccessibleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
  disabled?: boolean;
  className?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  onClick,
  ariaLabel,
  ariaPressed,
  ariaExpanded,
  ariaControls,
  disabled = false,
  className = ''
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled && onClick) {
        onClick();
      }
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
};

/**
 * Live region for announcing dynamic content changes
 * Important for screen reader users when content changes (4.1.3)
 */
interface LiveRegionProps {
  children: React.ReactNode;
  /** politeness level */
  level?: 'polite' | 'assertive';
  /** role type */
  role?: 'status' | 'alert';
  /** Optional additional className */
  className?: string;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  level = 'polite',
  role = 'status',
  className = ''
}) => {
  return (
    <div
      role={role}
      aria-live={level}
      aria-atomic="true"
      className={`sr-only ${className}`}
    >
      {children}
    </div>
  );
};
