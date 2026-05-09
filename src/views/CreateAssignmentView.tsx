import { CreateAssignmentWizard, type CreateAssignmentWizardProps } from "../components/CreateAssignmentWizard";
import HebrewAssignmentWizard from "../components/HebrewAssignmentWizard";
import type { ClassData } from "../core/supabase";

// Thin wrapper so the wizard (and its deps) can be lazy-loaded via React.lazy.
//
// Branches on the parent class's subject so a Hebrew-tab teacher gets
// the Hebrew lemma picker instead of the English Word picker.  The
// English wizard is too entangled with Word-shaped data (OCR, topic
// packs, paste-against-ALL_WORDS) to retrofit cleanly — a separate
// HebrewAssignmentWizard avoids the shape-mismatch entirely.
//
// CreateAssignmentWizardProps types `selectedClass` more narrowly than
// the full ClassData (it doesn't carry teacherUid or subject in that
// declaration).  At runtime the App.tsx caller always passes a full
// ClassData, so we cast through `unknown` to read .subject and to feed
// the Hebrew wizard.
export default function CreateAssignmentView(props: CreateAssignmentWizardProps) {
  const fullClass = props.selectedClass as unknown as ClassData | null;
  if (fullClass?.subject === "hebrew") {
    return (
      <HebrewAssignmentWizard
        selectedClass={fullClass}
        selectedWords={props.selectedWords}
        setSelectedWords={props.setSelectedWords}
        assignmentTitle={props.assignmentTitle}
        setAssignmentTitle={props.setAssignmentTitle}
        assignmentDeadline={props.assignmentDeadline}
        setAssignmentDeadline={props.setAssignmentDeadline}
        assignmentModes={props.assignmentModes}
        setAssignmentModes={props.setAssignmentModes}
        handleSaveAssignment={props.handleSaveAssignment}
        onBack={props.onBack}
        isEditing={!!props.editingAssignment}
      />
    );
  }
  return <CreateAssignmentWizard {...props} />;
}
