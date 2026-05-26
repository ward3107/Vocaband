/**
 * AnnouncementBanner — global broadcast surface mounted at the App root.
 *
 * Reads from get_active_announcements (returns only announcements active now,
 * matching the caller's audience, and not previously dismissed). Shows the
 * highest-priority one (critical > warning > info, then newest). Dismiss
 * persists to public.announcement_dismissals so it doesn't reappear on
 * next session.
 *
 * Null when not authenticated, no active announcement, or fetch failed.
 */
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { supabase } from "../core/supabase";
import type { AppUser } from "../core/supabase";
import type { ActiveAnnouncement } from "../views/developer/devShared";

interface Props {
  user: AppUser | null;
}

const LEVEL_STYLE: Record<ActiveAnnouncement["level"], { cls: string; Icon: typeof Info }> = {
  info:     { cls: "from-sky-600 to-indigo-600",  Icon: Info },
  warning:  { cls: "from-amber-600 to-orange-600", Icon: AlertTriangle },
  critical: { cls: "from-rose-600 to-pink-600",   Icon: AlertCircle },
};

export default function AnnouncementBanner({ user }: Props) {
  const [items, setItems] = useState<ActiveAnnouncement[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch
    if (!user) {
      setItems([]);
      return;
    }
    let cancelled = false;
    void supabase.rpc("get_active_announcements").then(({ data, error }) => {
      if (cancelled) return;
      if (error || !Array.isArray(data)) {
        // Table not deployed yet, or RLS denied — silent fallback.
        setItems([]);
        return;
      }
      setItems(data as ActiveAnnouncement[]);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const dismiss = useCallback(async (id: string) => {
    // Optimistic: remove from local state first, then persist.
    setItems((prev) => prev.filter((a) => a.id !== id));
    await supabase.rpc("dismiss_announcement", { p_id: id });
  }, []);

  const current = items[0];
  if (!current) return null;

  const { cls, Icon } = LEVEL_STYLE[current.level];

  return (
    <AnimatePresence>
      <motion.div
        key={current.id}
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed top-0 inset-x-0 z-[60] pointer-events-none"
      >
        <div className={`mx-auto max-w-3xl m-2 rounded-2xl bg-gradient-to-r ${cls} text-white shadow-lg pointer-events-auto`}>
          <div className="px-4 py-3 flex items-start gap-3">
            <Icon className="w-5 h-5 mt-0.5 shrink-0 text-white/90" />
            <div className="flex-1 min-w-0">
              <div className="font-black text-base">{current.title}</div>
              <div className="text-white/90 text-sm mt-0.5 whitespace-pre-wrap">{current.message}</div>
            </div>
            {current.dismissible && (
              <button
                type="button"
                onClick={() => void dismiss(current.id)}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="p-1 rounded-lg hover:bg-white/15 shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5 text-white/80" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
