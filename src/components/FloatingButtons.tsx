import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Share2, MessageCircle, Link2, Check, ArrowUp, Facebook, Instagram, Music2 } from "lucide-react";
import { motion } from "motion/react";

// Brand colors for social platforms
const BRAND_COLORS = {
  facebook: '#1877F2',
  whatsapp: '#25D366',
  instagram: 'linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D, #F56040, #F77737, #FCAF45, #FFDC80)',
  tiktok: 'linear-gradient(45deg, #00F2EA, #FF0050)',
  copy: '#6B7280',
  copySuccess: '#22C55E',
} as const;

interface FloatingButtonsProps {
  showBackToTop?: boolean;
  className?: string;
  /** When provided, the share button shares the student's level/XP card
   * instead of the generic "check out Vocaband" message.  Drives viral
   * growth — students posting "I'm Level X Word Wizard" on social. */
  shareLevel?: {
    displayName: string;
    xp: number;
    title: string;          // "Word Wizard", "Scholar", etc.
    emoji: string;          // title emoji
  };
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
  showBackToTop = false,
  className = "",
  shareLevel,
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

  // Build the shared URL. HARDCODED to www.vocaband.com rather than
  // window.location.origin because students (and teachers testing the
  // share flow) sometimes have the app open on a Cloudflare preview
  // URL, a staging deploy, or localhost — and those URLs were ending
  // up in shared messages, giving recipients broken links.  The
  // canonical URL always works.
  //
  // `?share=1` keeps logged-in visitors on the landing page instead
  // of auto-redirecting them to their own dashboard (see the
  // fromShareLinkRef handling in App.tsx).
  const shareUrl = "https://www.vocaband.com/?share=1";

  // Share text flips between "level flex" (when shareLevel is provided
  // from the student dashboard) and the generic landing-page teaser
  // (everywhere else).  The level version is what drives viral growth —
  // students flexing their rank with friends.
  const shareText = useMemo(() => {
    if (shareLevel) {
      return `${shareLevel.emoji} I'm ${shareLevel.xp} XP — a ${shareLevel.title} on Vocaband! Can you beat my level?`;
    }
    return "Check out Vocaband — the fun way to master English vocabulary!";
  }, [shareLevel]);

  // Prefer the OS native share sheet when available — on mobile it
  // opens every messaging app the user has installed (WhatsApp,
  // iMessage, Telegram, Signal, Gmail, …) and passes the URL +
  // title properly so recipients get a clickable preview card.
  // Way more reliable than guessing third-party share URL formats.
  // Falls back silently when unsupported (most desktop browsers);
  // the per-network buttons still work as manual fallbacks.
  const tryNativeShare = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      return false;
    }
    try {
      await navigator.share({ title: "Vocaband", text: shareText, url: shareUrl });
      return true;
    } catch {
      // User cancelled or share failed — swallow; caller falls back
      // to the per-network menu.
      return false;
    }
  }, [shareText, shareUrl]);

  const shareOptions = useMemo(() => [
    {
      name: "Facebook",
      icon: Facebook,
      brandColor: BRAND_COLORS.facebook,
      gradient: false,
      action: () => {
        // Facebook dropped support for the `quote` parameter in 2017 —
        // passing it is silently ignored, so we don't send it anymore.
        // The URL itself carries the preview (OG tags on the landing
        // page supply the title, description, image).
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          "_blank",
          "noopener,noreferrer"
        );
      },
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      brandColor: BRAND_COLORS.whatsapp,
      gradient: false,
      action: () => {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
          "_blank",
          "noopener,noreferrer"
        );
      },
    },
    {
      name: "Instagram",
      icon: Instagram,
      brandColor: BRAND_COLORS.instagram,
      gradient: true,
      // Instagram doesn't support web-based link sharing (no web share
      // intent — their deep link is app-only + often unreliable).  So we
      // copy the message + URL to clipboard and nudge the student to
      // paste it into their Instagram story / DM.
      action: () => {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        setCopied(true);
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = setTimeout(() => {
          setCopied(false);
          copiedTimerRef.current = null;
        }, 2500);
        // Best-effort: open the Instagram app on mobile via intent URL.
        // Falls back silently on desktop.
        try { window.open('instagram://', '_blank'); } catch { /* noop */ }
      },
    },
    {
      name: "TikTok",
      icon: Music2,
      brandColor: BRAND_COLORS.tiktok,
      gradient: true,
      // TikTok has no share intent either — same copy-to-clipboard
      // pattern + best-effort app deep link.
      action: () => {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        setCopied(true);
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = setTimeout(() => {
          setCopied(false);
          copiedTimerRef.current = null;
        }, 2500);
        try { window.open('snssdk1233://', '_blank'); } catch { /* noop */ }
      },
    },
    {
      name: "Copy Link",
      icon: copied ? Check : Link2,
      brandColor: copied ? BRAND_COLORS.copySuccess : BRAND_COLORS.copy,
      gradient: false,
      action: () => {
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        setCopied(true);
        if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = setTimeout(() => {
          setCopied(false);
          copiedTimerRef.current = null;
        }, 2000);
      },
    },
  ], [shareUrl, shareText, copied]);

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

      {/* Share Button.  On mobile, tries the OS-native share sheet
          first (WhatsApp / iMessage / Messenger / any installed
          messaging app).  Falls back to the per-network menu when
          the browser doesn't support navigator.share (most desktop
          browsers, older mobile Safari). */}
      <motion.button
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (shareOpen) {
            // Already open — treat as a toggle-close.
            setShareOpen(false);
            return;
          }
          const used = await tryNativeShare();
          if (!used) {
            // No navigator.share support — fall back to the menu.
            setShareOpen(true);
          }
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

              // Brand color styling
              const getBrandStyle = () => {
                if (option.gradient) {
                  return {
                    background: option.brandColor as string,
                    color: 'white',
                    boxShadow: isThisHovered
                      ? `0 0 20px ${option.brandColor === BRAND_COLORS.instagram ? 'rgba(193, 53, 132, 0.6)' : 'rgba(0, 242, 234, 0.6)'}`
                      : '0 4px 12px rgba(0, 0, 0, 0.15)',
                  };
                }
                return {
                  backgroundColor: option.brandColor as string,
                  color: 'white',
                  boxShadow: isThisHovered
                    ? `0 0 16px ${option.brandColor}80`
                    : '0 4px 12px rgba(0, 0, 0, 0.15)',
                };
              };

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
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 border-2 border-white/20"
                  style={getBrandStyle()}
                  title={option.name}
                  role="menuitem"
                  aria-label={`Share via ${option.name}`}
                >
                  <Icon size={20} strokeWidth={2.5} aria-hidden="true" />
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
