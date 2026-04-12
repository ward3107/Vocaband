import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Share2, MessageCircle, Link2, Check, ArrowUp, Facebook } from "lucide-react";
import { motion } from "motion/react";

interface FloatingButtonsProps {
  showBackToTop?: boolean;
  className?: string;
}

// Get the visible background color at a point by traversing the DOM
function getVisibleBackgroundColor(x: number, y: number): { r: number; g: number; b: number } | null {
  const elements = document.elementsFromPoint(x, y);

  for (const el of elements) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.closest('[data-floating-buttons]')) continue;

    const style = window.getComputedStyle(el);
    const bg = style.backgroundColor;

    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
      const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        if (r > 5 || g > 5 || b > 5) {
          return { r, g, b };
        }
      }
    }
  }

  const bodyStyle = window.getComputedStyle(document.body);
  const bodyBg = bodyStyle.backgroundColor;
  if (bodyBg && bodyBg !== "rgba(0, 0, 0, 0)" && bodyBg !== "transparent") {
    const match = bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
    }
  }

  return null;
}

function getLuminance(rgb: { r: number; g: number; b: number }): number {
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

function getSaturation(rgb: { r: number; g: number; b: number }): number {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  return max === 0 ? 0 : (max - min) / max;
}

function getColorTemperature(rgb: { r: number; g: number; b: number }): 'warm' | 'cool' | 'neutral' {
  const sat = getSaturation(rgb);
  if (sat < 0.15) return 'neutral';
  const { r, g, b } = rgb;
  if (r > b && (r > g || g > b)) return 'warm';
  if (b > r || (b > g * 0.8)) return 'cool';
  return 'neutral';
}

// Convert RGBA to rgba() string
const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;

const FloatingButtons: React.FC<FloatingButtonsProps> = ({
  showBackToTop = true,
  className = "",
}) => {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBackToTopBtn, setShowBackToTopBtn] = useState(false);
  const [buttonColor, setButtonColor] = useState({ r: 245, g: 245, b: 244 });
  const shareRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the "copied" reset timer on unmount so it can't fire on an
  // unmounted component (React would log a state-on-unmounted warning).
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const detectBackgroundColor = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const samplePoints = [
      { x: rect.left - 20, y: rect.top + rect.height / 2 },
      { x: rect.right + 20, y: rect.top + rect.height / 2 },
      { x: rect.left + rect.width / 2, y: rect.top - 20 },
      { x: rect.left + rect.width / 2, y: rect.bottom + 60 },
    ];

    const colors: { r: number; g: number; b: number }[] = [];

    for (const point of samplePoints) {
      const color = getVisibleBackgroundColor(point.x, point.y);
      if (color) colors.push(color);
    }

    if (colors.length === 0) return;

    const avgColor = colors.reduce(
      (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }),
      { r: 0, g: 0, b: 0 }
    );

    setButtonColor({
      r: Math.round(avgColor.r / colors.length),
      g: Math.round(avgColor.g / colors.length),
      b: Math.round(avgColor.b / colors.length),
    });
  }, []);

  useEffect(() => {
    let ticking = false;
    let lastScrollY = 0;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setShowBackToTopBtn(currentScrollY > 300);

      if (Math.abs(currentScrollY - lastScrollY) > 50) {
        lastScrollY = currentScrollY;
        if (!ticking) {
          requestAnimationFrame(() => {
            detectBackgroundColor();
            ticking = false;
          });
          ticking = true;
        }
      }
    };

    detectBackgroundColor();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", detectBackgroundColor);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", detectBackgroundColor);
    };
  }, [detectBackgroundColor]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setShareOpen(false);
      }
    };
    if (shareOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [shareOpen]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = "Check out Vocaband - the fun way to master English vocabulary for Israeli EFL students!";

  const shareOptions = useMemo(() => [
    {
      name: "Facebook",
      icon: Facebook,
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank");
      },
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      action: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}%20${encodeURIComponent(shareUrl)}`, "_blank");
      },
    },
    {
      name: "Copy Link",
      icon: copied ? Check : Link2,
      action: () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = setTimeout(() => {
          setCopied(false);
          copiedTimerRef.current = null;
        }, 2000);
      },
    },
  ], [shareUrl, copied]);

  // Calculate dynamic button styles - use ONLY backgroundColor, never 'background'
  const styles = useMemo(() => {
    const luminance = getLuminance(buttonColor);
    const saturation = getSaturation(buttonColor);
    const temperature = getColorTemperature(buttonColor);

    const isDark = luminance < 0.5;
    const isVibrant = saturation > 0.4;
    const isMuted = saturation > 0.15 && saturation <= 0.4;

    // Shared glass effect properties
    const glassBase = {
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    };

    if (isVibrant) {
      if (temperature === 'warm') {
        return {
          button: { ...glassBase, backgroundColor: rgba(8, 145, 145, 0.55), color: 'white', boxShadow: '0 8px 32px rgba(8, 145, 145, 0.25)', border: '1px solid rgba(255, 255, 255, 0.15)' },
          hover: { backgroundColor: rgba(13, 148, 136, 0.7), boxShadow: '0 12px 40px rgba(8, 145, 145, 0.35)' },
          popup: {},
          popupItem: { backgroundColor: rgba(8, 145, 145, 0.85), color: 'white' },
        };
      } else {
        return {
          button: { ...glassBase, backgroundColor: rgba(249, 115, 22, 0.55), color: 'white', boxShadow: '0 8px 32px rgba(249, 115, 22, 0.25)', border: '1px solid rgba(255, 255, 255, 0.15)' },
          hover: { backgroundColor: rgba(234, 88, 12, 0.7), boxShadow: '0 12px 40px rgba(249, 115, 22, 0.35)' },
          popup: {},
          popupItem: { backgroundColor: rgba(249, 115, 22, 0.85), color: 'white' },
        };
      }
    }

    if (isMuted) {
      return {
        button: { ...glassBase, backgroundColor: rgba(139, 92, 246, 0.55), color: 'white', boxShadow: '0 8px 32px rgba(139, 92, 246, 0.25)', border: '1px solid rgba(255, 255, 255, 0.15)' },
        hover: { backgroundColor: rgba(124, 58, 237, 0.7), boxShadow: '0 12px 40px rgba(139, 92, 246, 0.35)' },
        popup: {},
        popupItem: { backgroundColor: rgba(139, 92, 246, 0.85), color: 'white' },
      };
    }

    // Neutral background
    if (isDark) {
      return {
        button: { ...glassBase, backgroundColor: rgba(255, 255, 255, 0.12), color: 'white', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.15)' },
        hover: { backgroundColor: rgba(255, 255, 255, 0.22), boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)' },
        popup: {},
        popupItem: { backgroundColor: rgba(255, 255, 255, 0.9), color: 'rgb(28, 25, 23)' },
      };
    } else {
      return {
        button: { ...glassBase, backgroundColor: rgba(28, 25, 23, 0.35), color: 'white', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)', border: '1px solid rgba(255, 255, 255, 0.08)' },
        hover: { backgroundColor: rgba(28, 25, 23, 0.5), boxShadow: '0 12px 40px rgba(0, 0, 0, 0.18)' },
        popup: {},
        popupItem: { backgroundColor: rgba(28, 25, 23, 0.75), color: 'white' },
      };
    }
  }, [buttonColor]);

  const [isHovered, setIsHovered] = useState<string | null>(null);

  // Get button style based on state
  const getButtonStyle = (type: 'share' | 'backToTop') => {
    const base = styles.button;
    const hover = isHovered === type ? styles.hover : {};
    return { ...base, ...hover };
  };

  return (
    <div
      ref={shareRef}
      data-floating-buttons
      className={`fixed left-3 bottom-28 md:left-4 md:bottom-28 z-[80] flex flex-col gap-3 ${className}`}
    >
      <div
        ref={containerRef}
        className="absolute pointer-events-none"
        style={{ width: 60, height: 60 }}
      />

      {/* Share Button */}
      <motion.button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShareOpen(!shareOpen);
        }}
        onMouseEnter={() => setIsHovered('share')}
        onMouseLeave={() => setIsHovered(null)}
        whileHover={{ scale: shareOpen ? 1 : 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
        style={getButtonStyle('share')}
        aria-label="Share options"
        aria-expanded={shareOpen}
        aria-haspopup="menu"
        title="Share"
      >
        <Share2 size={18} strokeWidth={2.5} aria-hidden="true" />
      </motion.button>

      {/* Share Options - Horizontal popup */}
      {shareOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute top-[-12px] left-[44px] flex items-center gap-2 p-2 z-50 min-w-fit max-w-[calc(100vw-70px)]"
          style={styles.popup}
          role="menu"
          aria-label="Share options"
        >
            {shareOptions.map((option, index) => {
              const Icon = option.icon;
              const isThisHovered = isHovered === option.name;
              return (
                <motion.button
                  key={option.name}
                  onClick={() => {
                    option.action();
                    if (option.name !== "Copy Link") setShareOpen(false);
                  }}
                  onMouseEnter={() => setIsHovered(option.name)}
                  onMouseLeave={() => setIsHovered(null)}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all duration-200"
                  style={
                    copied && option.name === "Copy Link"
                      ? { backgroundColor: 'rgb(34, 197, 94)', color: 'white' }
                      : { ...styles.popupItem, transform: isThisHovered ? 'scale(1.15)' : undefined }
                  }
                  title={option.name}
                  role="menuitem"
                  aria-label={`Share via ${option.name}`}
                >
                  <Icon size={18} strokeWidth={2.5} aria-hidden="true" />
                </motion.button>
              );
            })}
          </motion.div>
        )}

      {/* Back to Top */}
      {showBackToTop && showBackToTopBtn && (
        <motion.button
          onClick={scrollToTop}
          onMouseEnter={() => setIsHovered('backToTop')}
          onMouseLeave={() => setIsHovered(null)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
          style={getButtonStyle('backToTop')}
          title="Back to top"
        >
          <ArrowUp size={22} strokeWidth={2.5} aria-hidden="true" />
        </motion.button>
      )}
    </div>
  );
};

export default FloatingButtons;
