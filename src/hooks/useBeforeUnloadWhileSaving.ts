/**
 * useBeforeUnloadWhileSaving — hooks `beforeunload` so the browser
 * shows its native "are you sure?" dialog when the user tries to
 * close the tab or navigate away while a save is in flight.
 *
 * Modern Chrome / Firefox / Safari ignore `e.returnValue`'s actual
 * string and show a generic browser-supplied message, but the guard
 * still fires — that's the important part: the user gets a chance
 * to cancel before their unsaved score disappears.
 *
 * Pass `isSaving=true` when there's a pending network write; the
 * listener auto-removes when you flip back to false or unmount.
 */
import { useEffect } from "react";

export function useBeforeUnloadWhileSaving(isSaving: boolean): void {
  useEffect(() => {
    if (!isSaving) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Your score is still saving. Are you sure you want to leave?";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSaving]);
}
