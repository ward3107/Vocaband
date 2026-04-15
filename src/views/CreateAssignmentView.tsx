import { CreateAssignmentWizard, type CreateAssignmentWizardProps } from "../components/CreateAssignmentWizard";

// Thin wrapper so the wizard (and its deps) can be lazy-loaded via React.lazy.
export default function CreateAssignmentView(props: CreateAssignmentWizardProps) {
  return <CreateAssignmentWizard {...props} />;
}
