import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Share2, MessageCircle, Link2, Check, ArrowUp, Twitter, Mail } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FloatingButtonsProps {
  showBackToTop?: boolean;
  className?: string;
}

// Detect background color at a specific position
function getBackgroundColorAtPoint(x: number, y: number): { r: number; g: number; b: number } | null {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    if (el instanceof HTMLElement || el instanceof SVGElement) {
      const style = window.getComputedStyle(el);
      const bg = style.backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
        const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3]),
          };
        }
      }
    }
  }
  return null;
}

// Analyze color and return button style info
function analyzeColor(rgb: { r: number; g: number; b: number } | null): {
  isDark: boolean;
  hue: 'warm' | 'cool' | 'neutral';
  saturation: 'vibrant' | 'muted' | 'neutral';
} {
  if (!rgb) {
    return { isDark: false, hue: 'neutral', saturation: 'neutral' };
  }

  const { r, g, b } = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;

  // Determine hue category
  let hue: 'warm' | 'cool' | 'neutral' = 'neutral';
  if (sat > 0.2) {
    if (r > g && r > b) hue = 'warm'; // Reds, oranges
    else if (b > r || (g > r && g > b)) hue = 'cool'; // Blues, purples
    else if (g > b && g > r * 0.8) hue = 'warm'; // Greens, yellows
  }

  // Determine saturation
  let saturation: 'vibrant' | 'muted' | 'neutral' = 'neutral';
  if (sat > 0.5) saturation = 'vibrant';
  else if (sat > 0.2) saturation = 'muted';

  return {
    isDark: luminance < 0.5,
    hue,
    saturation,
  };
}

const FloatingButtons: React.FC<FloatingButtonsProps> = ({
  showBackToTop = true,
  className = "",
}) => {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBackToTopBtn, setShowBackToTopBtn] = useState(false);
  const [colorInfo, setColorInfo] = useState<{ isDark: boolean; hue: 'warm' | 'cool' | 'neutral'; saturation: 'vibrant' | 'muted' | 'neutral' }>({
    isDark: false,
    hue: 'neutral',
    saturation: 'neutral',
  });
  const shareRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect background color
  const detectBackground = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const rgb = getBackgroundColorAtPoint(x, y);
    const info = analyzeColor(rgb);
    setColorInfo(info);
  }, []);

  // Scroll listener with detection
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      setShowBackToTopBtn(window.scrollY > 300);

      if (!ticking) {
        requestAnimationFrame(() => {
          detectBackground();
          ticking = false;
        });
        ticking = true;
      }
    };

    detectBackground(); // Initial check
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", detectBackground);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", detectBackground);
  };
  }, [detectBackground]);

  // Close share when clicking outside
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
      name: "WhatsApp",
      icon: MessageCircle,
      action: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}%20${encodeURIComponent(shareUrl)}`, "_blank");
      },
    },
    {
      name: "Twitter",
      icon: Twitter,
      action: () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
      },
    },
    {
      name: "Email",
      icon: Mail,
      action: () => {
        window.open(`mailto:?subject=${encodeURIComponent("Check out Vocaband!")}&body=${encodeURIComponent(shareText + "\n\n" + shareUrl)}`, "_blank");
      },
    },
    {
      name: "Copy Link",
      icon: copied ? Check : Link2,
      action: () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
    },
  ], [shareUrl, shareText, copied]);

  // Dynamic button styles based on detected background
  const buttonStyles = useMemo(() => {
    const { isDark, hue, saturation } = colorInfo;

    // Base styles for different background types
    if (saturation === 'vibrant') {
      // Vibrant colored background - use contrasting solid color
      if (hue === 'warm') {
        // Warm background (orange, pink) -> Cool button (blue/purple)
        return {
          button: "bg-blue-600 text-white shadow-lg shadow-blue-500/40",
          hover: "hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/50",
          popup: "bg-blue-600 border-blue-500",
        };
      } else if (hue === 'cool') {
        // Cool background (blue, purple) -> Warm button (orange/pink)
        return {
          button: "bg-orange-500 text-white shadow-lg shadow-orange-500/40",
          hover: "hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/50",
          popup: "bg-orange-500 border-orange-400",
        };
      }
    }

    // Muted colored background
    if (saturation === 'muted') {
      return {
        button: "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/40",
        hover: "hover:from-violet-500 hover:to-fuchsia-500 hover:shadow-xl",
        popup: "bg-gradient-to-br from-violet-600 to-fuchsia-600 border-violet-500",
      };
    }

    // Neutral/grayscale background
    if (isDark) {
      // Dark background -> Light button
      return {
        button: "bg-white text-stone-900 shadow-lg shadow-white/30",
        hover: "hover:bg-stone-100 hover:shadow-xl",
        popup: "bg-white border-stone-200",
      };
    } else {
      // Light background -> Dark button
      return {
        button: "bg-stone-900 text-white shadow-lg shadow-stone-900/30",
        hover: "hover:bg-stone-800 hover:shadow-xl",
        popup: "bg-stone-900 border-stone-700",
      };
    }
  }, [colorInfo]);

  return (
    <div
      ref={shareRef}
      className={`fixed left-3 bottom-28 md:left-4 md:bottom-28 z-40 flex flex-col gap-2 md:gap-3 ${className}`}
    >
      {/* Invisible detector element */}
      <div ref={containerRef} className="absolute inset-0 pointer-events-none" />

      {/* Share Button */}
      <motion.button
        onClick={() => setShareOpen(!shareOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
          shareOpen
            ? "bg-white text-stone-900 border-white shadow-xl"
            : `${buttonStyles.button} ${buttonStyles.hover} border-transparent`
        }`}
        title="Share"
      >
        <Share2 size={22} strokeWidth={2.5} />
      </motion.button>

      {/* Expanded options */}
      <AnimatePresence>
        {shareOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute bottom-full left-0 mb-2 flex flex-col gap-2 backdrop-blur-xl rounded-2xl p-3 shadow-2xl border-2 transition-colors duration-300 ${buttonStyles.popup}`}
          >
            {shareOptions.map((option) => {
              const Icon = option.icon;
              return (
                <motion.button
                  key={option.name}
                  onClick={() => {
                    option.action();
                    if (option.name !== "Copy Link") setShareOpen(false);
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md ${
                    copied && option.name === "Copy Link"
                      ? "bg-green-500 text-white"
                      : "bg-white/90 text-stone-900 hover:bg-white"
                  }`}
                  title={option.name}
                >
                  <Icon size={22} strokeWidth={2.5} />
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back to Top */}
      {showBackToTop && showBackToTopBtn && (
        <motion.button
          onClick={scrollToTop}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-2 border-transparent ${buttonStyles.button} ${buttonStyles.hover}`}
          title="Back to top"
        >
          <ArrowUp size={22} strokeWidth={2.5} />
        </motion.button>
      )}
    </div>
  );
};

export default FloatingButtons;
