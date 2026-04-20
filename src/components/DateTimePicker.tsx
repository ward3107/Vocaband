/**
 * DateTimePicker — modern date + time picker for assignment deadlines.
 *
 * Custom-built in Tailwind (no third-party CSS imports, no class-name
 * mismatches with react-day-picker upgrades). Gives us full design control
 * and matches the app's palette exactly.
 *
 * Features:
 *  - Click-to-open popover with a proper 7-column calendar grid
 *  - Month navigation with prev/next arrows
 *  - Today highlighted with a ring; selected date filled with primary
 *  - Past dates disabled (deadlines can't be in the past)
 *  - Hour + minute selectors below the calendar (00–23 / 00/15/30/45)
 *  - Trigger shows "Tue, 20 Apr 2026 · 14:00" so teachers see the full
 *    picked value without reopening
 *  - Closes on outside click; does NOT close on date click (teacher picks
 *    date, adjusts time, then clicks Done)
 *  - Emits ISO datetime string "YYYY-MM-DDTHH:mm" on change
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, Clock, Check } from "lucide-react";

interface DateTimePickerProps {
  /** ISO string — accepts "YYYY-MM-DD" (legacy, date-only) or "YYYY-MM-DDTHH:mm" */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Defaults to today at 00:00. Past dates are disabled. */
  minDate?: Date;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MINUTES_OPTIONS = [0, 15, 30, 45];

function toIsoDateTime(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function parseIsoDateTime(value: string): Date | null {
  if (!value) return null;
  // Accept "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm[:ss]"
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, y, m, d, h, mi] = match;
  const date = new Date(
    parseInt(y, 10),
    parseInt(m, 10) - 1,
    parseInt(d, 10),
    parseInt(h || "0", 10),
    parseInt(mi || "0", 10),
  );
  return isNaN(date.getTime()) ? null : date;
}

function formatDisplay(date: Date): string {
  const weekday = WEEKDAY_LABELS[date.getDay()];
  const month = MONTH_LABELS[date.getMonth()].slice(0, 3);
  const day = date.getDate();
  const year = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${weekday}, ${day} ${month} ${year} · ${hh}:${mi}`;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Build a 6×7 grid of Date objects for a given month view. */
function getCalendarGrid(viewYear: number, viewMonth: number): Date[] {
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startDay = firstOfMonth.getDay();
  const gridStart = new Date(viewYear, viewMonth, 1 - startDay);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  return cells;
}

export function DateTimePicker({ value, onChange, placeholder = "Pick a date and time", minDate }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parseIsoDateTime(value), [value]);
  const minDay = useMemo(() => startOfDay(minDate ?? new Date()), [minDate]);

  // View-month tracks the current calendar page; defaults to the selected
  // date's month, or to the current month if nothing is selected yet.
  const [viewYear, setViewYear] = useState<number>(parsed?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsed?.getMonth() ?? new Date().getMonth());

  // Selected date state — separate from final value so teacher can tweak
  // date + time in the popover, then hit Done.
  const [draftDate, setDraftDate] = useState<Date | null>(parsed);

  // When opening, snap view-month to whatever's currently selected (or today).
  useEffect(() => {
    if (!open) return;
    const target = parsed ?? new Date();
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setDraftDate(parsed);
  }, [open, parsed]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const grid = useMemo(() => getCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const today = startOfDay(new Date());

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(m => m - 1);
    }
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const pickDay = (day: Date) => {
    // Preserve current draft time, only swap the date part.
    const timeSource = draftDate ?? new Date();
    const next = new Date(
      day.getFullYear(), day.getMonth(), day.getDate(),
      timeSource.getHours(), timeSource.getMinutes(),
    );
    setDraftDate(next);
  };

  const setHour = (h: number) => {
    const base = draftDate ?? new Date();
    setDraftDate(new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, base.getMinutes()));
  };
  const setMinute = (m: number) => {
    const base = draftDate ?? new Date();
    setDraftDate(new Date(base.getFullYear(), base.getMonth(), base.getDate(), base.getHours(), m));
  };

  const confirm = () => {
    if (draftDate) onChange(toIsoDateTime(draftDate));
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setDraftDate(null);
    setOpen(false);
  };

  const draftHour = draftDate?.getHours() ?? 0;
  const draftMinute = draftDate?.getMinutes() ?? 0;
  const displayText = parsed ? formatDisplay(parsed) : placeholder;

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all cursor-pointer outline-none bg-white ${
          open ? "border-primary ring-4 ring-primary/10" : "border-stone-300/60 hover:border-primary/40"
        }`}
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <CalendarIcon size={18} className="text-primary shrink-0" />
        <span className={`flex-1 text-sm font-bold ${parsed ? "text-stone-900" : "text-stone-400"}`}>
          {displayText}
        </span>
        {parsed && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); clear(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); clear(); }
            }}
            className="p-1 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
            aria-label="Clear date"
          >
            <X size={14} />
          </span>
        )}
      </button>

      {/* Popover - opens upward to avoid going off-screen on mobile */}
      {open && (
        <div className="absolute z-50 bottom-full left-0 mb-2 bg-white rounded-2xl shadow-2xl border border-stone-200 w-80 overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 rounded-lg hover:bg-primary/10 flex items-center justify-center text-stone-600 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-black text-stone-900 text-base">
              {MONTH_LABELS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 rounded-lg hover:bg-primary/10 flex items-center justify-center text-stone-600 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 px-2 pt-2">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="h-7 flex items-center justify-center text-[10px] font-bold text-stone-400 uppercase">
                {w.slice(0, 2)}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5 px-2 pb-2">
            {grid.map((day) => {
              const inMonth = day.getMonth() === viewMonth;
              const disabled = day < minDay;
              const isSelected = draftDate && sameDay(day, draftDate);
              const isToday = sameDay(day, today);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => !disabled && pickDay(day)}
                  disabled={disabled}
                  className={`h-9 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${
                    isSelected
                      ? "bg-primary text-white shadow-md hover:bg-primary/90"
                      : disabled
                      ? "text-stone-300 cursor-not-allowed"
                      : inMonth
                      ? "text-stone-900 hover:bg-primary/10 hover:text-primary"
                      : "text-stone-300 hover:bg-stone-50"
                  } ${isToday && !isSelected ? "ring-2 ring-primary/40" : ""}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {/* Time row */}
          <div className="border-t border-stone-100 px-4 py-3 flex items-center gap-3">
            <Clock size={16} className="text-primary shrink-0" />
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wide">Time</span>
            <select
              id="deadline-hour"
              name="hour"
              aria-label="Hour"
              value={draftHour}
              onChange={(e) => setHour(parseInt(e.target.value, 10))}
              className="flex-1 px-2 py-1.5 rounded-lg border border-stone-200 bg-white text-sm font-bold text-stone-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 cursor-pointer"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
              ))}
            </select>
            <span className="text-stone-400 font-black">:</span>
            <select
              id="deadline-minute"
              name="minute"
              aria-label="Minute"
              value={draftMinute}
              onChange={(e) => setMinute(parseInt(e.target.value, 10))}
              className="flex-1 px-2 py-1.5 rounded-lg border border-stone-200 bg-white text-sm font-bold text-stone-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 cursor-pointer"
            >
              {MINUTES_OPTIONS.map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
              ))}
            </select>
          </div>

          {/* Done / Clear footer */}
          <div className="border-t border-stone-100 px-4 py-3 flex gap-2">
            <button
              type="button"
              onClick={clear}
              className="flex-1 py-2 rounded-lg text-sm font-bold text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!draftDate}
              className="flex-1 py-2 rounded-lg text-sm font-black bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
            >
              <Check size={14} />
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
