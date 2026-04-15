import SetupWizard, { type SetupWizardProps } from "../components/setup/SetupWizard";

// Thin wrapper so the wizard (and its deps) can be lazy-loaded via React.lazy.
// Main's quick-play-setup shares SetupWizard with create-assignment, so the
// view file just forwards props to the shared component.
export default function QuickPlaySetupView(props: SetupWizardProps) {
  return <SetupWizard {...props} />;
}
