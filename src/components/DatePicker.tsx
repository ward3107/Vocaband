/**
 * DatePicker — modern Tailwind-styled date picker for assignment deadlines.
 *
 * Replaces the native <input type="date"> that looked browser-default + ugly
 * on Windows. Wraps react-day-picker so we keep full design control:
 *  - Opens in a popover below the trigger button
 *  - Matches the app palette (primary for selected, surface-container for hover)
 *  - Past dates are disabled (assignments can't have a deadline in the past)
 *  - Shows the full weekday name + "d MMM yyyy" in the trigger so teachers
 *    can see what they picked without clicking
 *  - Closes on outside click and on date selection
 *  - Mobile-friendly: large touch targets, popover is centered + backdrop
 */
import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, isValid } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import "react-day-picker/dist/style.css";

interface DatePickerProps {
  value: string; // ISO string "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: Date; // defaults to today
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedDate = value ? new Date(value + "T00:00:00") : undefined;
  const selected = parsedDate && isValid(parsedDate) ? parsedDate : undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const floor = minDate ?? today;

  // Close on outside click (popover UX — keeps desktop feel familiar)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const iso = format(date, "yyyy-MM-dd");
    onChange(iso);
    setOpen(false);
  };

  const displayText = selected ? format(selected, "EEE, d MMM yyyy") : placeholder;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all cursor-pointer outline-none bg-white ${
          open
            ? "border-primary ring-4 ring-primary/10"
            : "border-stone-300/60 hover:border-primary/40"
        }`}
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <CalendarIcon size={18} className="text-primary shrink-0" />
        <span className={`flex-1 text-sm font-bold ${selected ? "text-stone-900" : "text-stone-400"}`}>
          {displayText}
        </span>
        {selected && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              }
            }}
            className="p-1 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
            aria-label="Clear date"
          >
            <X size={14} />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl border border-stone-200 p-3 min-w-[280px]">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            disabled={{ before: floor }}
            showOutsideDays
            className="vocaband-daypicker"
            classNames={{
              root: "text-sm",
              caption: "flex items-center justify-between mb-3 px-1",
              caption_label: "font-black text-stone-900 text-base",
              nav: "flex gap-1",
              nav_button: "w-8 h-8 rounded-lg hover:bg-primary/10 flex items-center justify-center text-stone-600 transition-colors cursor-pointer",
              nav_button_previous: "",
              nav_button_next: "",
              table: "w-full border-collapse",
              head_row: "flex",
              head_cell: "w-9 h-9 flex items-center justify-center text-[11px] font-bold text-stone-400 uppercase",
              row: "flex w-full",
              cell: "w-9 h-9 flex items-center justify-center p-0",
              day: "w-9 h-9 rounded-lg font-bold text-sm hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer flex items-center justify-center text-stone-900",
              day_selected: "!bg-primary !text-white hover:!bg-primary/90 hover:!text-white shadow-md",
              day_today: "ring-2 ring-primary/40",
              day_outside: "text-stone-300",
              day_disabled: "!text-stone-300 !cursor-not-allowed hover:!bg-transparent hover:!text-stone-300",
            }}
          />
        </div>
      )}
    </div>
  );
}
