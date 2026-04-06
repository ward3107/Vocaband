import React from 'react';
import { ArrowLeft } from 'lucide-react';
import PublicNav from './PublicNav';

interface Props {
  onNavigate: (page: "home" | "terms" | "privacy") => void;
  onGetStarted: () => void;
  onBack: () => void;
}

export default function AccessibilityStatement({ onNavigate, onGetStarted, onBack }: Props) {
  return (
    <div className="min-h-screen bg-surface font-body">
      <PublicNav onNavigate={onNavigate} onGetStarted={onGetStarted} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button onClick={onBack} className="flex items-center gap-2 text-primary font-bold mb-6 hover:underline">
          <ArrowLeft size={18} /> Back
        </button>

        <h1 className="text-3xl sm:text-4xl font-black text-on-surface mb-2">Accessibility Statement</h1>
        <p className="text-on-surface-variant mb-8">Last updated: April 2026</p>

        <div className="prose prose-stone max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-black text-on-surface mb-3">Our Commitment</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Vocaband is committed to ensuring digital accessibility for all users, including students, teachers, and parents with disabilities.
              We strive to meet <strong>WCAG 2.0 Level AA</strong> and the <strong>Israeli Standard IS 5568</strong> for web accessibility.
              Our goal is to provide an inclusive learning experience where every student can practice English vocabulary effectively.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-on-surface mb-3">Accessibility Features</h2>

            <h3 className="text-base font-bold text-on-surface mt-4 mb-2">Accessibility Toolbar</h3>
            <p className="text-on-surface-variant leading-relaxed mb-2">
              A floating accessibility button (bottom-right corner) provides 10 adjustable settings:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant space-y-1">
              <li><strong>Font Size</strong> — Scale text from 88% to 200%</li>
              <li><strong>High Contrast</strong> — Black background with gold text and cyan links</li>
              <li><strong>Dyslexia Font</strong> — Switch to OpenDyslexic or Comic Sans MS</li>
              <li><strong>Readable Font</strong> — Switch to Open Sans / Helvetica Neue</li>
              <li><strong>Reduce Motion</strong> — Minimize all animations and transitions</li>
              <li><strong>Highlight Links</strong> — Underline and add borders to all links</li>
              <li><strong>Large Cursor</strong> — 32px custom cursor with 44px minimum touch targets</li>
              <li><strong>Line Height</strong> — Adjust spacing between lines (1.5 to 2.0)</li>
              <li><strong>Letter Spacing</strong> — Adjust spacing between letters (normal to extra-wide)</li>
              <li><strong>Focus Indicators</strong> — Enhanced focus outlines on all interactive elements</li>
            </ul>
            <p className="text-on-surface-variant leading-relaxed mt-2">
              All settings are saved in your browser and persist across visits.
            </p>

            <h3 className="text-base font-bold text-on-surface mt-4 mb-2">Keyboard Navigation</h3>
            <ul className="list-disc pl-6 text-on-surface-variant space-y-1">
              <li>Skip links ("Skip to main content" and "Skip to navigation") at the top of every page</li>
              <li>All interactive elements are reachable by Tab key</li>
              <li>Buttons respond to Enter and Space keys</li>
              <li>Modals trap focus and close with Escape key</li>
              <li>Visible focus indicators with 3px blue outline</li>
            </ul>

            <h3 className="text-base font-bold text-on-surface mt-4 mb-2">Screen Readers</h3>
            <ul className="list-disc pl-6 text-on-surface-variant space-y-1">
              <li>ARIA landmarks (<code>main</code>, <code>navigation</code>) for page structure</li>
              <li>Descriptive <code>aria-label</code> attributes on buttons, icons, and controls</li>
              <li>Live regions (<code>aria-live</code>) for dynamic content updates (scores, toasts)</li>
              <li>Form fields with associated labels and error announcements</li>
              <li>Visually hidden text for screen reader context where needed</li>
            </ul>

            <h3 className="text-base font-bold text-on-surface mt-4 mb-2">Language & RTL Support</h3>
            <ul className="list-disc pl-6 text-on-surface-variant space-y-1">
              <li>Full support for English, Hebrew, and Arabic</li>
              <li>Automatic right-to-left (RTL) layout for Hebrew and Arabic content</li>
              <li>Bidirectional text handling in vocabulary displays, translations, and game modes</li>
            </ul>

            <h3 className="text-base font-bold text-on-surface mt-4 mb-2">Visual Design</h3>
            <ul className="list-disc pl-6 text-on-surface-variant space-y-1">
              <li>Color contrast ratios meet WCAG AA requirements (4.5:1 for text, 3:1 for large text)</li>
              <li>Information is not conveyed by color alone — icons and text labels are always present</li>
              <li>Respects <code>prefers-reduced-motion</code> system setting — all animations are disabled</li>
              <li>Text can be resized up to 200% without loss of content</li>
              <li>Responsive design adapts to all screen sizes from 320px to desktop</li>
            </ul>

            <h3 className="text-base font-bold text-on-surface mt-4 mb-2">Audio & Pronunciation</h3>
            <ul className="list-disc pl-6 text-on-surface-variant space-y-1">
              <li>Word pronunciation is triggered by user action (click/tap), not automatically</li>
              <li>All audio content has visual equivalents (the word is always displayed alongside audio)</li>
              <li>Volume controls available in Quick Play sessions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-on-surface mb-3">Standards Compliance</h2>
            <ul className="list-disc pl-6 text-on-surface-variant space-y-1">
              <li><strong>WCAG 2.0 Level AA</strong> — Web Content Accessibility Guidelines</li>
              <li><strong>IS 5568</strong> — Israeli Standard for Web Accessibility</li>
              <li><strong>Section 508</strong> — Compliance with US federal accessibility requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-on-surface mb-3">Known Limitations</h2>
            <ul className="list-disc pl-6 text-on-surface-variant space-y-1">
              <li><strong>Game modes with time pressure</strong> — Some vocabulary games involve quick responses which may be challenging for users who need extra time. Flashcard mode and Sentence Builder mode have no time pressure.</li>
              <li><strong>QR code scanning</strong> — Quick Play join via QR code requires a camera. Students can also join by entering the session code manually.</li>
              <li><strong>Third-party content</strong> — Google OAuth login and Google Fonts are loaded from external services which have their own accessibility policies.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-on-surface mb-3">Testing</h2>
            <p className="text-on-surface-variant leading-relaxed">
              We test accessibility using a combination of automated tools and manual testing:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant space-y-1">
              <li>Chrome DevTools Lighthouse accessibility audit</li>
              <li>Keyboard-only navigation testing</li>
              <li>Screen reader testing with NVDA and VoiceOver</li>
              <li>High contrast and reduced motion mode testing</li>
              <li>Mobile device testing on iOS and Android</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-on-surface mb-3">Feedback & Contact</h2>
            <p className="text-on-surface-variant leading-relaxed">
              If you encounter any accessibility barriers while using Vocaband, or have suggestions for improvement, please contact us:
            </p>
            <ul className="list-disc pl-6 text-on-surface-variant space-y-2 mt-2">
              <li><strong>Email:</strong> accessibility@vocaband.com</li>
              <li><strong>Website:</strong> www.vocaband.com</li>
            </ul>
            <p className="text-on-surface-variant leading-relaxed mt-2">
              We aim to respond to accessibility feedback within 5 business days and to resolve reported issues within 30 days.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
