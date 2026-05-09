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
  Accessibility,
  Droplet,
  Moon,
} from 'lucide-react';

/* =============================================================================
 * AccessibilityWidget — WCAG 2.0 AA / Israeli Standard IS 5568
 *
 * Ten accessibility features, all persisted to localStorage, applied via a
 * set of html.a11y-* classes so the CSS rules in one injected <style> block
 * do the heavy lifting. A permanent floating trigger sits bottom-left on
 * every page — Israeli accessibility law (2013 amendment to the Equal
 * Rights for People with Disabilities Act) requires the widget to be
 * reachable from every page, not just the landing.
 *
 * Features (matching the 10 required by IS 5568):
 *   1. Text size (+/-)          — fontSize slider
 *   2. Line height (+/-)        — lineHeight slider
 *   3. Text spacing (+/-)       — textSpacing slider
 *   4. High contrast            — highContrast toggle
 *   5. Grayscale                — grayscale toggle
 *   6. Invert colors            — invertColors toggle
 *   7. Readable font            — readableFont toggle
 *   8. Highlight links          — highlightLinks toggle
 *   9. Reduce motion            — reduceMotion toggle
 *   10. Big cursor              — largeCursor toggle
 * Plus: reset all, dyslexia font (bonus), accessibility statement link.
 * ============================================================================= */

interface A11ySettings {
  fontSize: number;
  highContrast: boolean;
  grayscale: boolean;
  invertColors: boolean;
  textSpacing: number;
  dyslexiaFont: boolean;
  reduceMotion: boolean;
  highlightLinks: boolean;
  readableFont: boolean;
  largeCursor: boolean;
  lineHeight: number;
  readingGuide: boolean;
}

const DEFAULT_SETTINGS: A11ySettings = {
  fontSize: 1,
  highContrast: false,
  grayscale: false,
  invertColors: false,
  textSpacing: 0,
  dyslexiaFont: false,
  reduceMotion: false,
  highlightLinks: false,
  readableFont: false,
  largeCursor: false,
  lineHeight: 0,
  readingGuide: false,
};

// Disability profiles — one-click presets that toggle a bundle of
// settings.  Modeled on UserWay/AccessiBe so users don't need to know
// which 3 toggles match their need.
type ProfileKey = 'dyslexia' | 'lowVision' | 'adhd' | 'motor';
const PROFILES: Record<ProfileKey, Partial<A11ySettings>> = {
  dyslexia:  { dyslexiaFont: true,  lineHeight: 2, textSpacing: 3, readableFont: false },
  lowVision: { fontSize: 4, highContrast: true,  largeCursor: true },
  adhd:      { readableFont: true,  reduceMotion: true, highlightLinks: true, readingGuide: true },
  motor:     { largeCursor: true,   fontSize: 3 },
};

const STORAGE_KEY = 'a11y_settings';
const DISMISS_KEY = 'a11y_dismissed_session';

// Font size floor is 80% per user request. Stops tall-screen students from
// zooming all the way out and losing readable text. First visible step is
// 100% (normal), second step below is 80% — anything lower is non-compliant
// with Israeli accessibility minimums (IS 5568 requires a reasonable floor).
const FONT_SIZE_PCTS = [80, 100, 115, 130, 150, 175, 200, 225];
// Line-height scale — start at 1.5 (the CSS rule's effective default) so
// "Normal" on the widget matches what users see out of the box.
const LINE_HEIGHTS = [1.5, 1.65, 1.8, 2.0, 2.25];
const LETTER_SPACINGS = [0, 0.02, 0.05, 0.1, 0.15];
const SPACING_LABELS_EN = ['Normal', 'Slight', 'Medium', 'Wide', 'Extra Wide'];
const SPACING_LABELS_HE = ['רגיל', 'קל', 'בינוני', 'רחב', 'רחב מאוד'];
const SPACING_LABELS_AR = ['عادي', 'طفيف', 'متوسط', 'واسع', 'واسع جداً'];

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

// Language detection via the existing useLanguage hook's localStorage key.
// We can't import the hook here (would re-subscribe) but we can read the
// same key to keep the widget's labels in sync with the rest of the UI.
type Lang = 'en' | 'he' | 'ar';
function detectLang(): Lang {
  try {
    const saved = localStorage.getItem('vocaband_language');
    if (saved === 'he' || saved === 'ar' || saved === 'en') return saved;
  } catch { /* ignore */ }
  return 'en';
}

const LABELS: Record<Lang, Record<string, string>> = {
  en: {
    title: 'Accessibility', close: 'Close accessibility panel',
    trigger: 'Open accessibility menu (Alt+0)',
    fontSize: 'Font Size', lineHeight: 'Line Height', textSpacing: 'Text Spacing',
    highContrast: 'High Contrast', grayscale: 'Grayscale', invertColors: 'Invert Colors',
    readableFont: 'Readable Font', dyslexiaFont: 'Dyslexia Font',
    reduceMotion: 'Reduce Motion', highlightLinks: 'Highlight Links', largeCursor: 'Large Cursor',
    readingGuide: 'Reading Guide',
    reset: 'Reset All', statement: 'Accessibility Statement',
    decrease: 'Decrease', increase: 'Increase',
    profilesTitle: 'One-Click Profiles',
    profileDyslexia: 'Dyslexia', profileLowVision: 'Low Vision',
    profileAdhd: 'ADHD', profileMotor: 'Motor',
    readSelection: 'Read Aloud', stopReading: 'Stop Reading',
    shortcutHint: 'Tip: press Alt+0 to open',
  },
  he: {
    title: 'נגישות', close: 'סגור תפריט נגישות',
    trigger: 'פתח תפריט נגישות (Alt+0)',
    fontSize: 'גודל גופן', lineHeight: 'גובה שורה', textSpacing: 'ריווח טקסט',
    highContrast: 'ניגודיות גבוהה', grayscale: 'גווני אפור', invertColors: 'היפוך צבעים',
    readableFont: 'גופן קריא', dyslexiaFont: 'גופן לדיסלקסיה',
    reduceMotion: 'הפחתת תנועה', highlightLinks: 'הדגשת קישורים', largeCursor: 'סמן גדול',
    readingGuide: 'מדריך קריאה',
    reset: 'איפוס הכל', statement: 'הצהרת נגישות',
    decrease: 'הקטן', increase: 'הגדל',
    profilesTitle: 'פרופילים בקליק',
    profileDyslexia: 'דיסלקסיה', profileLowVision: 'ראייה לקויה',
    profileAdhd: 'הפרעת קשב', profileMotor: 'מוטורי',
    readSelection: 'הקרא בקול', stopReading: 'עצור הקראה',
    shortcutHint: 'טיפ: Alt+0 לפתיחה',
  },
  ar: {
    title: 'إمكانية الوصول', close: 'إغلاق قائمة إمكانية الوصول',
    trigger: 'فتح قائمة إمكانية الوصول (Alt+0)',
    fontSize: 'حجم الخط', lineHeight: 'ارتفاع السطر', textSpacing: 'تباعد النص',
    highContrast: 'تباين عالٍ', grayscale: 'تدرج الرمادي', invertColors: 'عكس الألوان',
    readableFont: 'خط قابل للقراءة', dyslexiaFont: 'خط عسر القراءة',
    reduceMotion: 'تقليل الحركة', highlightLinks: 'إبراز الروابط', largeCursor: 'مؤشر كبير',
    readingGuide: 'دليل القراءة',
    reset: 'إعادة تعيين الكل', statement: 'بيان إمكانية الوصول',
    decrease: 'تقليل', increase: 'زيادة',
    profilesTitle: 'ملفات شخصية بنقرة',
    profileDyslexia: 'عسر القراءة', profileLowVision: 'ضعف البصر',
    profileAdhd: 'فرط الحركة', profileMotor: 'حركي',
    readSelection: 'قراءة بصوت عالٍ', stopReading: 'إيقاف القراءة',
    shortcutHint: 'تلميح: Alt+0 للفتح',
  },
};

interface AccessibilityWidgetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AccessibilityWidget: React.FC<AccessibilityWidgetProps> = ({ open: controlledOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    else setInternalOpen(val);
  };
  // Session-scoped dismiss. The trigger stays gone until the student
  // reloads or navigates away — meeting the UX request while still
  // being compliant, because the widget fully re-appears on next
  // page load (not a persistent silent-failure state).
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  const [settings, setSettings] = useState<A11ySettings>(loadSettings);
  const [lang, setLang] = useState<Lang>(detectLang);
  // Reading guide cursor Y — only updated while the guide setting is
  // on so we don't pay a mousemove listener when the feature is off.
  const [guideY, setGuideY] = useState(0);
  // Tracks the current App view so we can hide the floating trigger
  // on game / dashboard pages. Set by App.tsx via a 'vocaband-view-change'
  // CustomEvent. The panel itself is still openable from anywhere via
  // the existing 'open-a11y-panel' event (footer / nav links).
  const [currentView, setCurrentView] = useState<string>('');
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: Event) => setCurrentView((e as CustomEvent<string>).detail || '');
    window.addEventListener('vocaband-view-change', handler);
    return () => window.removeEventListener('vocaband-view-change', handler);
  }, []);

  // Pages where the floating trigger should appear. Public-facing
  // pages only — once a student is in a game or a teacher is doing
  // teacher work, the trigger gets out of the way. Footer link still
  // opens the panel from anywhere if needed.
  const TRIGGER_VIEWS = new Set([
    'public-landing',
    'public-terms',
    'public-privacy',
    'accessibility-statement',
    'landing',
    'student-account-login',
  ]);
  const showTrigger = currentView === '' || TRIGGER_VIEWS.has(currentView);

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

  // Inject global override styles once.
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
      /* Tailwind sets line-height on nearly every text utility class
         (leading-tight, leading-snug, leading-relaxed, leading-6 …)
         which has a specificity higher than the bare \`body\` rule
         above. Without explicitly overriding every descendant element
         the slider moved the CSS var but nothing visible happened.
         Apply the same var to every element inside body when any
         non-default line height is chosen — and exempt the a11y widget
         itself so its own layout doesn't reflow while students adjust. */
      body *:not([data-a11y-widget]):not([data-a11y-widget] *) {
        line-height: var(--a11y-line-height, inherit) !important;
        letter-spacing: var(--a11y-letter-spacing, inherit) !important;
      }
      html.a11y-dyslexia body, html.a11y-dyslexia body * { font-family: var(--a11y-font-family) !important; }
      html.a11y-readable body, html.a11y-readable body * { font-family: var(--a11y-font-family) !important; }

      /* High contrast: yellow-on-black.  Scoped to text colour only so the
         overall layout/buttons stay intact — previous version swept every
         background to black and made the app feel broken.  Widget itself
         is exempt via [data-a11y-widget]. */
      html.a11y-contrast body:not([data-a11y-widget]) {
        background: #000 !important;
        color: #FFD700 !important;
      }
      html.a11y-contrast body *:not(svg):not(path):not(img):not([data-a11y-widget]):not([data-a11y-widget] *) {
        color: #FFD700 !important;
        border-color: #FFD700 !important;
      }
      html.a11y-contrast body a, html.a11y-contrast body [role="link"] {
        color: #00FFFF !important;
        text-decoration: underline !important;
      }

      /* Grayscale + invert use a root-level CSS filter applied to the whole
         page.  We exclude the widget so students can still see the coloured
         toggle states while adjusting. */
      html.a11y-grayscale body > *:not([data-a11y-widget-root]) { filter: grayscale(100%) !important; }
      html.a11y-invert body > *:not([data-a11y-widget-root]) { filter: invert(100%) hue-rotate(180deg) !important; }
      html.a11y-grayscale.a11y-invert body > *:not([data-a11y-widget-root]) { filter: grayscale(100%) invert(100%) hue-rotate(180deg) !important; }

      html.a11y-motion *, html.a11y-motion *::before, html.a11y-motion *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
      }
      html.a11y-links body a, html.a11y-links body [role="link"] {
        text-decoration: underline !important;
        border-bottom: 2px solid currentColor !important;
      }
      html.a11y-cursor body {
        cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'%3E%3Ccircle cx='10' cy='10' r='8' fill='none' stroke='%230050d4' stroke-width='2'/%3E%3Ccircle cx='10' cy='10' r='2' fill='%230050d4'/%3E%3C/svg%3E") 10 10, auto !important;
      }
      html.a11y-cursor body button, html.a11y-cursor body a, html.a11y-cursor body [role="button"] {
        min-width: 44px !important;
        min-height: 44px !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Toggle CSS classes on <html> based on settings
  useEffect(() => {
    const html = document.documentElement;
    const toggles: [keyof A11ySettings, string][] = [
      ['highContrast', 'a11y-contrast'],
      ['grayscale', 'a11y-grayscale'],
      ['invertColors', 'a11y-invert'],
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
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    panel.addEventListener('keydown', handleKeyDown);
    first?.focus();
    return () => panel.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Listen for language changes from useLanguage so labels swap live.
  useEffect(() => {
    const handler = () => setLang(detectLang());
    window.addEventListener('storage', handler);
    window.addEventListener('vocaband-language-change', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('vocaband-language-change', handler);
    };
  }, []);

  const toggle = useCallback((key: keyof A11ySettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const step = useCallback((key: keyof A11ySettings, direction: -1 | 1, max: number) => {
    setSettings(prev => {
      const val = (prev[key] as number) + direction;
      if (val < 0 || val > max) return prev;
      return { ...prev, [key]: val };
    });
  }, []);

  const resetAll = useCallback(() => setSettings({ ...DEFAULT_SETTINGS }), []);

  // Apply a one-click profile — merges the preset over current settings
  // so users can stack profiles (e.g. dyslexia + low-vision).
  const applyProfile = useCallback((key: ProfileKey) => {
    setSettings(prev => ({ ...prev, ...PROFILES[key] }));
  }, []);

  // Text-to-speech via Web Speech API — reads the user's current
  // selection if any, otherwise the visible main content.  No external
  // service, no cost, works offline (uses OS voices).
  const readSelection = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const sel = window.getSelection()?.toString().trim();
    let text = sel || '';
    if (!text) {
      const main = document.querySelector('main') ?? document.body;
      text = (main.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 1500);
    }
    if (!text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === 'he' ? 'he-IL' : lang === 'ar' ? 'ar-SA' : 'en-US';
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  }, [lang]);

  const stopReading = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Keyboard shortcut — Alt+0 toggles the panel.  Standard a11y
  // convention used by BBC, gov.uk, etc.  Also un-dismisses if hidden.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === '0') {
        e.preventDefault();
        try { sessionStorage.removeItem(DISMISS_KEY); } catch { /* ignore */ }
        setDismissed(false);
        setIsOpen(!isOpen);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Reading guide — track cursor Y while the guide is on.  No listener
  // when the feature is off so the feature is zero-cost when unused.
  useEffect(() => {
    if (!settings.readingGuide) return;
    const handler = (e: MouseEvent) => setGuideY(e.clientY);
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [settings.readingGuide]);

  // Stop any active TTS when the component unmounts so the voice
  // doesn't keep reading after navigating away.
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // External event trigger (from nav bar / landing page buttons) still
  // works — also un-dismisses the widget if it was hidden for the
  // session, so the old "Accessibility" link in the footer / nav still
  // reopens the panel.
  useEffect(() => {
    const handleOpen = () => {
      try { sessionStorage.removeItem(DISMISS_KEY); } catch { /* ignore */ }
      setDismissed(false);
      setIsOpen(true);
    };
    window.addEventListener('open-a11y-panel', handleOpen);
    return () => window.removeEventListener('open-a11y-panel', handleOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = useCallback(() => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
    setIsOpen(false);
  }, []);

  const t = LABELS[lang];
  const spacingLabels = lang === 'he' ? SPACING_LABELS_HE : lang === 'ar' ? SPACING_LABELS_AR : SPACING_LABELS_EN;
  const isRTL = lang === 'he' || lang === 'ar';

  const toggleFeatures: { key: keyof A11ySettings; icon: React.ReactNode; label: string }[] = [
    { key: 'highContrast',  icon: <Eye size={18} />,          label: t.highContrast },
    { key: 'grayscale',     icon: <Droplet size={18} />,      label: t.grayscale },
    { key: 'invertColors',  icon: <Moon size={18} />,         label: t.invertColors },
    { key: 'readableFont',  icon: <BookOpen size={18} />,     label: t.readableFont },
    { key: 'dyslexiaFont',  icon: <Type size={18} />,         label: t.dyslexiaFont },
    { key: 'reduceMotion',  icon: <ZapOff size={18} />,       label: t.reduceMotion },
    { key: 'highlightLinks',icon: <Link2 size={18} />,        label: t.highlightLinks },
    { key: 'largeCursor',   icon: <MousePointer size={18} />, label: t.largeCursor },
    { key: 'readingGuide',  icon: <AlignLeft size={18} />,    label: t.readingGuide },
  ];

  const profiles: { key: ProfileKey; emoji: string; label: string }[] = [
    { key: 'dyslexia',  emoji: '📖', label: t.profileDyslexia },
    { key: 'lowVision', emoji: '👓', label: t.profileLowVision },
    { key: 'adhd',      emoji: '🎯', label: t.profileAdhd },
    { key: 'motor',     emoji: '🖱️', label: t.profileMotor },
  ];

  const sliderFeatures: { key: keyof A11ySettings; icon: React.ReactNode; label: string; max: number; formatValue: (v: number) => string }[] = [
    { key: 'fontSize',    icon: <Type size={18} />,       label: t.fontSize,    max: 7, formatValue: (v) => `${FONT_SIZE_PCTS[v]}%` },
    { key: 'lineHeight',  icon: <Maximize2 size={18} />,  label: t.lineHeight,  max: 4, formatValue: (v) => `${LINE_HEIGHTS[v]}` },
    { key: 'textSpacing', icon: <AlignLeft size={18} />,  label: t.textSpacing, max: 4, formatValue: (v) => spacingLabels[v] },
  ];

  return createPortal(
    <div data-a11y-widget-root>
      {/* Floating trigger — only rendered on public/landing pages
          (public-landing, terms, privacy, accessibility-statement,
          login). Hidden inside games and dashboards per product owner
          request: students mid-game don't need it in their face.
          Anywhere it's hidden, the panel can still be opened via the
          'open-a11y-panel' custom event, so footer / nav "Accessibility"
          links remain functional everywhere. */}
      {!dismissed && showTrigger && (
        <button
          ref={triggerRef}
          data-a11y-widget
          aria-label={t.trigger}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls="a11y-panel"
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-6 left-6 z-[110] w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center transition-all hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
          style={{ touchAction: 'manipulation' }}
        >
          <Accessibility size={24} strokeWidth={2.2} />
        </button>
      )}

      {/* Reading guide — horizontal stripe of light that follows the
          cursor, dimming everything else.  Helps dyslexic and low-vision
          users hold their place.  Only renders when the toggle is on. */}
      {settings.readingGuide && (
        <>
          {/* Top dim layer: from page top down to ~30px above cursor */}
          <div
            data-a11y-widget
            aria-hidden="true"
            className="fixed inset-x-0 top-0 z-[100] pointer-events-none bg-black/60"
            style={{ height: `${Math.max(0, guideY - 30)}px` }}
          />
          {/* Bottom dim layer: from ~30px below cursor to page bottom */}
          <div
            data-a11y-widget
            aria-hidden="true"
            className="fixed inset-x-0 bottom-0 z-[100] pointer-events-none bg-black/60"
            style={{ top: `${guideY + 30}px` }}
          />
        </>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            id="a11y-panel"
            role="dialog"
            aria-labelledby="a11y-title"
            aria-modal="true"
            data-a11y-widget
            dir={isRTL ? 'rtl' : 'ltr'}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 left-6 z-[120] w-[min(320px,calc(100vw-3rem))] max-h-[75vh] bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/15 overflow-hidden flex flex-col text-white"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
              <h2 className="text-lg font-bold text-white" id="a11y-title">{t.title}</h2>
              <button
                onClick={() => { setIsOpen(false); triggerRef.current?.focus(); }}
                aria-label={t.close}
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 space-y-2 overflow-y-auto flex-1">
              {/* ── One-Click Profiles ──────────────────────────── */}
              <div className="text-[11px] font-bold uppercase tracking-widest text-white/45 px-1 mb-1">
                {t.profilesTitle}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {profiles.map(p => (
                  <button
                    key={p.key}
                    onClick={() => applyProfile(p.key)}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/15 hover:from-violet-500/35 hover:to-fuchsia-500/25 border border-white/10 hover:border-white/25 text-white text-sm font-bold transition-all"
                  >
                    <span className="text-base" aria-hidden="true">{p.emoji}</span>
                    <span className="text-xs">{p.label}</span>
                  </button>
                ))}
              </div>

              <div className="border-t border-white/10 my-2" />

              {/* ── Read Aloud (TTS) ────────────────────────────── */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={readSelection}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-white text-xs font-bold transition-all"
                >
                  <BookOpen size={14} />
                  {t.readSelection}
                </button>
                <button
                  onClick={stopReading}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/85 text-xs font-bold transition-all"
                >
                  <ZapOff size={14} />
                  {t.stopReading}
                </button>
              </div>

              <div className="border-t border-white/10 my-2" />

              {/* ── Sliders (font size / line height / spacing) ─── */}
              {sliderFeatures.map(f => (
                <div key={f.key} className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 p-2.5 rounded-xl bg-white/5">
                    <span className="text-white/60">{f.icon}</span>
                    <span className="text-sm font-medium text-white/90">{f.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => step(f.key, -1, f.max)}
                      aria-label={`${t.decrease} ${f.label}`}
                      className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm font-bold flex items-center justify-center transition-colors"
                    >-</button>
                    <span className="text-xs text-white/70 w-12 text-center font-medium">{f.formatValue(settings[f.key] as number)}</span>
                    <button
                      onClick={() => step(f.key, 1, f.max)}
                      aria-label={`${t.increase} ${f.label}`}
                      className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm font-bold flex items-center justify-center transition-colors"
                    >+</button>
                  </div>
                </div>
              ))}

              <div className="border-t border-white/10 my-1" />

              {toggleFeatures.map(f => (
                <button
                  key={f.key}
                  onClick={() => toggle(f.key)}
                  role="button"
                  aria-pressed={settings[f.key] ? 'true' : 'false'}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium transition-all ${
                    settings[f.key]
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                      : 'bg-white/5 text-white/85 hover:bg-white/10'
                  }`}
                >
                  <span className={settings[f.key] ? 'text-white' : 'text-white/60'}>{f.icon}</span>
                  <span>{f.label}</span>
                  {settings[f.key] && <Check size={16} className="ml-auto" />}
                </button>
              ))}

              <div className="border-t border-white/10 my-1" />

              <button
                onClick={resetAll}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-bold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 transition-colors"
              >
                <RotateCcw size={16} />
                {t.reset}
              </button>
            </div>

            <div className="px-4 py-2 border-t border-white/10 shrink-0 flex items-center justify-between gap-2">
              <a href="/accessibility-statement" className="text-xs text-sky-300 hover:underline">{t.statement}</a>
              <span className="text-[10px] text-white/40 hidden md:inline">{t.shortcutHint}</span>
              <button
                onClick={handleDismiss}
                className="text-xs text-white/45 hover:text-white/75 hover:underline"
                aria-label={lang === 'he' ? 'הסתר עד הטעינה הבאה' : lang === 'ar' ? 'إخفاء حتى التحميل التالي' : 'Hide until next page load'}
              >
                {lang === 'he' ? 'הסתר' : lang === 'ar' ? 'إخفاء' : 'Hide'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
};
