import type { View } from "./core/views";
import { useAppController } from "./hooks/useAppController";
import { AppViewRouter } from "./views/AppViewRouter";

export default function App({ initialView }: { initialView?: View } = {}) {
  const routerDeps = useAppController(initialView);
  return <AppViewRouter {...routerDeps} />;
}
