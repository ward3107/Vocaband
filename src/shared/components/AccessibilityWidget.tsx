import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Type,
  Eye,
  Maximize2,
  AlignLeft,
  BookOpen,
  ZapOff,
  Link2,
  MousePointer,
  RotateCcw,
  X,
  Check,
} from 'lucide-react';

/* ============================================================================= */
/* AccessibilityWidget — WCAG 2.0 AA / IS 5568
/* 10 features, ARIA live, focus trap, localStorage persistence
/* Self-contained: no external deps, all styles inline
/*
/* Usage: <AccessibilityWidget />
/* ============================================================================= */

interface A11ySettings {
  fontSize: number;
  highContrast: boolean;
  textSpacing: number;
  dyslexiaFont: boolean;
  reduceMotion: boolean;
  highlightLinks: boolean;
  readableFont: boolean;
  largeCursor: boolean;
  lineHeight: number;
}

const DEFAULT_SETTINGS: A11ySettings = {
  fontSize: 1,
  highContrast: false,
  textSpacing: 0,
  dyslexiaFont: false,
  reduceMotion: false,
  highlightLinks: false,
  readableFont: false,
  largeCursor: false,
  lineHeight: 0,
};

const STORAGE_KEY = 'a11y_settings';
const DISMISS_KEY = 'a11y_dismissed';

const FONT_SIZE_PCTS = [88, 100, 112, 125, 138, 150, 175, 200]; // percentages of 16px base
const LINE_HEIGHTS = [1.5, 1.6, 1.7, 1.8, 2.0];
const LETTER_SPACINGS = [0, 0.02, 0.05, 0.1, 0.15];
const SPACING_LABELS = ['Normal', 'Slight', 'Medium', 'Wide', 'Extra Wide'];

function loadSettings(): A11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: A11ySettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

interface AccessibilityWidgetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AccessibilityWidget: React.FC<AccessibilityWidgetProps> = ({ open: controlledOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (val: boolean) => {
    if (onOpenChange) {
      onOpenChange(val);
    } else {
      setInternalOpen(val);
    }
  };
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  const [settings, setSettings] = useState<A11ySettings>(loadSettings);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Apply CSS overrides whenever settings change
  useEffect(() => {
    const root = document.documentElement;
    const s = settings;

    const baseFontSize = 16;
    root.style.setProperty('--a11y-font-size', `${baseFontSize * FONT_SIZE_PCTS[s.fontSize] / 100}px`);
    root.style.setProperty('--a11y-line-height', `${LINE_HEIGHTS[s.lineHeight]}`);
    root.style.setProperty('--a11y-letter-spacing', `${LETTER_SPACINGS[s.textSpacing]}em`);

    const fontFamily = s.dyslexiaFont
      ? "'OpenDyslexic', 'Comic Sans MS', cursive"
      : s.readableFont
        ? "'Open Sans', 'Helvetica Neue', sans-serif"
        : '';
    root.style.setProperty('--a11y-font-family', fontFamily);

    saveSettings(s);
  }, [settings]);

  // Inject global override styles (once)
  useEffect(() => {
    const id = 'a11y-global-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      html { font-size: var(--a11y-font-size, 16px) !important; }
      body {
        font-size: var(--a11y-font-size, 16px) !important;
        line-height: var(--a11y-line-height, 1.5) !important;
        letter-spacing: var(--a11y-letter-spacing, 0em) !important;
      }
      html.a11y-dyslexia body, html.a11y-dyslexia body * { font-family: var(--a11y-font-family) !important; }
      html.a11y-readable body, html.a11y-readable body * { font-family: var(--a11y-font-family) !important; }
      html.a11y-contrast body { background: #000 !important; color: #FFD700 !important; }
      html.a11y-contrast body *:not(svg):not(img):not([data-a11y-widget]) { color: #FFD700 !important; }
      html.a11y-contrast body a, html.a11y-contrast body [role="link"] { color: #00FFFF !important; text-decoration: underline !important; }
      html.a11y-contrast body input, html.a11y-contrast body textarea, html.a11y-contrast body select, html.a11y-contrast body button:not([data-a11y-widget]) { background: #1a1a1a !important; color: #FFD700 !important; border-color: #FFD700 !important; }
      html.a11y-motion * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
      html.a11y-links body a, html.a11y-links body [role="link"] { text-decoration: underline !important; border-bottom: 2px solid currentColor !important; }
      html.a11y-cursor body { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'%3E%3Ccircle cx='10' cy='10' r='8' fill='none' stroke='%230050d4' stroke-width='2'/%3E%3Ccircle cx='10' cy='10' r='2' fill='%230050d4'/%3E%3C/svg%3E") 10 10, auto !important; }
      html.a11y-cursor body button, html.a11y-cursor body a, html.a11y-cursor body [role="button"] { min-width: 44px !important; min-height: 44px !important; }
    `;
    document.head.appendChild(style);
  }, []);

  // Toggle CSS classes on <html> based on settings
  useEffect(() => {
    const html = document.documentElement;
    const toggles: [keyof A11ySettings, string][] = [
      ['highContrast', 'a11y-contrast'],
      ['dyslexiaFont', 'a11y-dyslexia'],
      ['readableFont', 'a11y-readable'],
      ['reduceMotion', 'a11y-motion'],
      ['highlightLinks', 'a11y-links'],
      ['largeCursor', 'a11y-cursor'],
    ];
    toggles.forEach(([key, cls]) => {
      if (settings[key]) html.classList.add(cls);
      else html.classList.remove(cls);
    });
  }, [settings]);

  // Focus trap while panel is open
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    panel.addEventListener('keydown', handleKeyDown);
    first?.focus();
    return () => panel.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const toggle = useCallback((key: keyof A11ySettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const step = useCallback((key: keyof A11ySettings, direction: -1 | 1, max: number) => {
    setSettings(prev => {
      const val = (prev[key] as number) + direction;
      if (val < 0) return prev;
      if (val > max) return prev;
      return { ...prev, [key]: val };
    });
  }, []);

  const resetAll = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const handleDismiss = useCallback(() => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
    setIsOpen(false);
  }, []);

  // Expose open function for external trigger (from nav bar)
  // Set this up BEFORE the dismissed check so nav button can re-open the panel
  useEffect(() => {
    const handleOpenA11y = () => {
      setDismissed(false);  // Un-dismiss if it was hidden
      setIsOpen(true);
    };
    window.addEventListener('open-a11y-panel', handleOpenA11y);
    return () => window.removeEventListener('open-a11y-panel', handleOpenA11y);
  }, []);

  if (dismissed && !isOpen) return null;

  // Feature definitions
  const toggleFeatures: { key: keyof A11ySettings; icon: React.ReactNode; label: string }[] = [
    { key: 'highContrast', icon: <Eye size={18} />, label: 'High Contrast' },
    { key: 'dyslexiaFont', icon: <Type size={18} />, label: 'Dyslexia Font' },
    { key: 'readableFont', icon: <BookOpen size={18} />, label: 'Readable Font' },
    { key: 'reduceMotion', icon: <ZapOff size={18} />, label: 'Reduce Motion' },
    { key: 'highlightLinks', icon: <Link2 size={18} />, label: 'Highlight Links' },
    { key: 'largeCursor', icon: <MousePointer size={18} />, label: 'Large Cursor' },
  ];

  const sliderFeatures: { key: keyof A11ySettings; icon: React.ReactNode; label: string; max: number; formatValue: (v: number) => string }[] = [
    { key: 'fontSize', icon: <Type size={18} />, label: 'Font Size', max: 7, formatValue: (v) => `${FONT_SIZE_PCTS[v]}%` },
    { key: 'lineHeight', icon: <Maximize2 size={18} />, label: 'Line Height', max: 4, formatValue: (v) => `${LINE_HEIGHTS[v]}` },
    { key: 'textSpacing', icon: <AlignLeft size={18} />, label: 'Text Spacing', max: 4, formatValue: (v) => SPACING_LABELS[v] },
  ];

  return createPortal(
    <>
      {/* Panel - only, triggered by nav bar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            id="a11y-panel"
            role="dialog"
            aria-labelledby="a11y-title"
            aria-modal="true"
            data-a11y-widget
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-[70] w-[320px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-200 shrink-0">
              <h2 className="text-lg font-bold text-stone-800" id="a11y-title">Accessibility</h2>
              <button
                onClick={() => { setIsOpen(false); triggerRef.current?.focus(); }}
                aria-label="Close accessibility panel"
                className="p-2 rounded-full hover:bg-stone-100 transition-colors text-stone-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="p-3 space-y-2 overflow-y-auto flex-1">
              {/* Slider features */}
              {sliderFeatures.map(f => (
                <div key={f.key} className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 p-2.5 rounded-xl bg-stone-50">
                    <span className="text-stone-400">{f.icon}</span>
                    <span className="text-sm font-medium text-stone-700">{f.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => step(f.key, -1, f.max)}
                      aria-label={`Decrease ${f.label}`}
                      className="w-8 h-8 rounded-lg bg-stone-200 text-stone-600 hover:bg-stone-300 text-sm font-bold flex items-center justify-center transition-colors"
                    >-</button>
                    <span className="text-xs text-stone-500 w-12 text-center font-medium">{f.formatValue(settings[f.key] as number)}</span>
                    <button
                      onClick={() => step(f.key, 1, f.max)}
                      aria-label={`Increase ${f.label}`}
                      className="w-8 h-8 rounded-lg bg-stone-200 text-stone-600 hover:bg-stone-300 text-sm font-bold flex items-center justify-center transition-colors"
                    >+</button>
                  </div>
                </div>
              ))}

              {/* Divider */}
              <div className="border-t border-stone-100 my-1" />

              {/* Toggle features */}
              {toggleFeatures.map(f => (
                <button
                  key={f.key}
                  onClick={() => toggle(f.key)}
                  role="button"
                  aria-pressed={settings[f.key] ? 'true' : 'false'}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium transition-all ${
                    settings[f.key]
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span className={settings[f.key] ? 'text-white' : 'text-stone-400'}>{f.icon}</span>
                  <span>{f.label}</span>
                  {settings[f.key] && <Check size={16} className="ml-auto" />}
                </button>
              ))}

              {/* Divider */}
              <div className="border-t border-stone-100 my-1" />

              {/* Reset */}
              <button
                onClick={resetAll}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <RotateCcw size={16} />
                Reset All
              </button>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-stone-100 shrink-0 flex justify-between items-center">
              <a href="/accessibility-statement" className="text-xs text-blue-600 hover:underline">Accessibility Statement</a>
              <button
                onClick={handleDismiss}
                className="text-xs text-stone-400 hover:text-stone-600 hover:underline"
              >
                Hide
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
};
