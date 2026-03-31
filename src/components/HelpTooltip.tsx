import React, { useState, useMemo } from "react";
import { useFloating, offset, flip, shift, arrow } from "@floating-ui/react";

export const HelpTooltip = ({ children, content, position = "bottom", className = "" }: {
  children: React.ReactNode;
  content: string | string[];
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}) => {
  const [arrowEl, setArrowEl] = useState<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const isMobile = useMemo(() => 'ontouchstart' in window, []);
  const contentArray = Array.isArray(content) ? content : [content];

  const { refs, floatingStyles, middlewareData } = useFloating({
    open: isVisible && !isMobile,
    onOpenChange: setIsVisible,
    placement: position,
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 }),
      arrow({ element: arrowEl }),
    ],
  });
  const { setReference, setFloating } = refs;

  const handleMouseEnter = () => {
    if (!isMobile) setIsVisible(true);
  };

  const staticSide = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  }[position];

  return (
    <>
      <span
        ref={setReference}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVisible(false)}
        className={className || "inline"}
      >
        {children}
      </span>
      {isVisible && !isMobile && (
        <div
          ref={setFloating}
          style={floatingStyles}
          className="z-50"
        >
          <div className="w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl">
            {contentArray.map((line, i) => (
              <p key={i} className={i > 0 ? "mt-1 text-slate-300" : ""}>{line}</p>
            ))}
          </div>
          {middlewareData.arrow?.x != null && (
            <div
              ref={setArrowEl}
              className="absolute w-2 h-2 bg-slate-900 rotate-45"
              style={{
                left: middlewareData.arrow.x ?? undefined,
                top: middlewareData.arrow.y ?? undefined,
                [staticSide]: '-4px',
              }}
            />
          )}
        </div>
      )}
    </>
  );
};

export const HelpIcon = ({ tooltip, position = "bottom" }: { tooltip: string | string[]; position?: "top" | "bottom" | "left" | "right" }) => (
  <HelpTooltip content={tooltip} position={position}>
    <span className="inline-flex items-center justify-center w-5 h-5 ml-1.5 text-slate-400 bg-slate-100 rounded-full cursor-help hover:bg-slate-200 hover:text-slate-600 transition-all">
      <span className="text-[10px] font-bold">?</span>
    </span>
  </HelpTooltip>
);
