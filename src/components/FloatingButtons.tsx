import React, { useState, useEffect, useRef, useCallback } from "react";
import { Share2, MessageCircle, Link2, Check, ArrowUp, Twitter, Mail } from "lucide-react";

import { motion } from "motion/react";

interface FloatingButtonsProps {
  showBackToTop?: boolean;
  className?: string;
}

const FloatingButtons: React.FC<FloatingButtonsProps> = ({
  showBackToTop = true,
  className = "",
}) => {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBackToTopBtn, setShowBackToTopBtn] = useState(false);
  const [isDarkBackground, setIsDarkBackground] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const checkBackgroundBrightness = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Get element at button position (excluding the button itself)
    const elementsAtPoint = document.elementsFromPoint(centerX, centerY);
    const backgroundElement = elementsAtPoint.find(
      (el) => !buttonRef.current?.contains(el) && el !== buttonRef.current
    );
    if (backgroundElement) {
      // Try to get computed background color
      const style = window.getComputedStyle(backgroundElement);
      const bgColor = style.backgroundColor;
      if (bgColor && bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent") {
        // Parse RGB values
        const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          const r = parseInt(match[1]);
          const g = parseInt(match[2]);
          const b = parseInt(match[3]);
          // Calculate relative luminance
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          setIsDarkBackground(luminance < 0.5);
          return;
        }
      }
    }
    // Fallback: check document background or use dark mode
    const isDarkMode = document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDarkBackground(isDarkMode);
  }, []);
  useEffect(() => {
    checkBackgroundBrightness();
    window.addEventListener("scroll", checkBackgroundBrightness);
    window.addEventListener("resize", checkBackgroundBrightness);
    return () => {
      window.removeEventListener("scroll", checkBackgroundBrightness);
      window.removeEventListener("resize", checkBackgroundBrightness);
  };
  }, [checkBackgroundBrightness]);
  // Show back to top button after scrolling
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTopBtn(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [shareOpen]);
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = "Check out Vocaband - the fun way to master English vocabulary for Israeli EFL students!";
  const shareOptions = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-green-500",
      action: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}%20${encodeURIComponent(shareUrl)}`, "_blank");
      },
    },
    {
      name: "Twitter",
      icon: Twitter,
      color: "bg-sky-500",
      action: () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
      },
    },
    {
      name: "Email",
      icon: Mail,
      color: "bg-stone-600",
      action: () => {
        window.open(`mailto:?subject=${encodeURIComponent("Check out Vocaband!")}&body=${encodeURIComponent(shareText + "\n\n" + shareUrl)}`, "_blank");
      },
    },
    {
      name: "Copy Link",
      icon: copied ? Check : Link2,
      color: copied ? "bg-green-500" : "bg-stone-500",
      action: () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
    },
  ];
  // Dynamic colors based on background brightness
  const buttonBaseClass = isDarkBackground
    ? "bg-white/95 text-stone-900 border-white/30"
    : "bg-stone-900/95 text-white border-stone-700/30";
  const hoverClass = isDarkBackground
    ? "hover:bg-white hover:text-primary"
    : "hover:bg-primary hover:text-white";
  return (
    <div
      ref={shareRef}
      className={`fixed left-3 bottom-28 md:left-4 md:bottom-28 z-40 flex flex-col gap-2 md:gap-3 ${className}`}
    >
      {/* Share Button */}
      <motion.button
        ref={buttonRef}
        onClick={() => setShareOpen(!shareOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`w-12 h-12 backdrop-blur-md rounded-full flex items-center justify-center transition-all shadow-lg border transition-colors duration-200 ${
          shareOpen
            ? "bg-primary text-white border-primary"
            : `${buttonBaseClass} ${hoverClass}`
        }`}
        title="Share"
      >
        <Share2 size={22} />
      </motion.button>
      {/* Expanded options */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`absolute bottom-full left-0 mb-2 flex flex-col gap-2 backdrop-blur-xl rounded-2xl p-3 shadow-2xl border transition-colors duration-200 ${
          isDarkBackground
            ? "bg-stone-900/95 border-stone-700"
            : "bg-white/95 border-stone-200"
        }`}
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
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md ${option.color} text-white`}
              title={option.name}
            >
              <Icon size={22} strokeWidth={2.5} />
            </motion.button>
          );
        })}
      </motion.div>
      {/* Back to Top */}
      {showBackToTop && showBackToTopBtn && (
        <motion.button
          onClick={scrollToTop}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={`w-12 h-12 backdrop-blur-md rounded-full flex items-center justify-center transition-all shadow-lg border transition-colors duration-200 ${buttonBaseClass} ${hoverClass}`}
          title="Back to top"
        >
          <ArrowUp size={22} strokeWidth={2.5} />
        </motion.button>
      )}
    </div>
  );
};
export default FloatingButtons;
