/**
 * WordPicker — reusable word-selection UX shared between the
 * assignment SetupWizard, Class Show setup, and Worksheet builder.
 *
 * Why this exists:
 * Teachers reported that Class Show and Worksheet only let them pick
 * from a Set or pre-fill from one assignment.  They wanted the SAME
 * word-picking experience as the assignment setup wizard: paste,
 * type, OCR, topic packs, saved groups, custom add — and to mix
 * them freely before launching a Class Show or printing a worksheet.
 *
 * Implementation:
 * Internally renders `WordInputStep2026` with `hideContinueButton`
 * set, so the wizard-specific "Continue →" CTA is suppressed and the
 * caller can place its own next-step button after the picker.  Every
 * other prop passes through unchanged, so any feature added to
 * WordInputStep2026 (translation, OCR, AI batch, saved-group
 * management) is automatically available everywhere WordPicker is
 * used.
 */
import WordInputStep2026, { type WordInputStep2026Props } from './WordInputStep2026';

export type WordPickerProps = Omit<WordInputStep2026Props, 'onNext' | 'onBack' | 'hideContinueButton'>;

export default function WordPicker(props: WordPickerProps) {
  return (
    <WordInputStep2026
      {...props}
      hideContinueButton
      onNext={() => { /* parent handles next-step */ }}
      onBack={() => { /* parent handles back */ }}
    />
  );
}
