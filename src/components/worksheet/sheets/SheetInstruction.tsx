/**
 * SheetInstruction — one short, clear English instruction line at the
 * top of every worksheet exercise.
 *
 * Always English, regardless of the translation language picked for the
 * vocabulary column: the worksheets teach English, and weak EFL learners
 * benefit from reading the same plain directions on every task.  Kept
 * deliberately small so it doesn't eat vertical space on the printout.
 */
export function SheetInstruction({ text }: { text: string }) {
  return (
    <p style={{ fontSize: '10pt', color: '#374151', margin: '0 0 0.5rem', lineHeight: 1.3 }}>
      <strong>Instructions:</strong> {text}
    </p>
  );
}
