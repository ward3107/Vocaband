/**
 * useCreateAssignmentDeps — assembles the CreateAssignmentProvider value
 * bag for App.tsx.
 *
 * Nothing could be absorbed here: every field is produced by hooks whose
 * outputs are shared with hooks that stay in App (useAssignmentBuilderState
 * feeds useTeacherActions + useAssignmentAutoPopulate; the OCR state feeds
 * QuickPlaySetupSection; handleDocxUpload/handleOcrUpload are reused by
 * Quick Play setup), so their call sites can't move without reordering the
 * global hook sequence.  This builder owns the bag assembly plus the
 * `selectedClass` gate — App passes its possibly-null selection and gets
 * `null` back, keeping the render branch equivalent to the old
 * `view === "create-assignment" && selectedClass`.
 *
 * Contains no hook calls, so its position in App.tsx has no effect on the
 * hook order.
 *
 * WHY the returned bag is NOT memoized: it's the same fresh object literal
 * App always passed to CreateAssignmentProvider, so the context value's
 * identity per render is unchanged — the wizard's re-render behavior stays
 * byte-for-byte identical to the inline version.
 */
import type { ClassData } from '../core/supabase';
import type { CreateAssignmentSectionDeps } from '../views/CreateAssignmentContext';

export type UseCreateAssignmentDepsArgs = Omit<
  CreateAssignmentSectionDeps,
  'selectedClass'
> & {
  selectedClass: ClassData | null;
};

export function useCreateAssignmentDeps(
  args: UseCreateAssignmentDepsArgs,
): CreateAssignmentSectionDeps | null {
  const { selectedClass, ...rest } = args;
  if (!selectedClass) return null;
  return { ...rest, selectedClass };
}
