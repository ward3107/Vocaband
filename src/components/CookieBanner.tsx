import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cookie, ChevronUp, ChevronDown, Shield, BarChart3, Settings, Check, Lock } from "lucide-react";

export interface CookiePreferences {
  essential: boolean;  // Always true, can't be disabled
  analytics: boolean;
  functional: boolean;
}

interface CookieBannerProps {
  onAccept: () => void;
  onCustomize: (preferences: CookiePreferences) => void;
}

const cookieCategories = [
  {
    id: "essential" as const,
    name: "Essential Cookies",
    description: "Required for the website to function. Includes authentication and security.",
    icon: Shield,
    required: true,
  },
  {
    id: "analytics" as const,
    name: "Analytics Cookies",
    description: "Help us understand how you use the site so we can improve your experience.",
    icon: BarChart3,
    required: false,
  },
  {
    id: "functional" as const,
    name: "Functional Cookies",
    description: "Remember your preferences like theme, language, and game settings.",
    icon: Settings,
    required: false,
  },
];

const CookieBanner: React.FC<CookieBannerProps> = ({ onAccept, onCustomize }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: true,
    functional: true,
  });

  const togglePreference = (id: keyof CookiePreferences) => {
    if (id === "essential") return; // Can't disable essential cookies
    setPreferences((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSavePreferences = () => {
    onCustomize(preferences);
  };

  return (
    <div className="fixed bottom-0 left-0 w-full z-[100] px-3 pb-4 md:px-8 md:pb-12 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay: 0.3 }}
        className="max-w-4xl mx-auto bg-slate-900/95 backdrop-blur-2xl p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_25px_70px_-15px_rgba(139,92,246,0.4)] pointer-events-auto border border-white/15 max-h-[85vh] md:max-h-none flex flex-col"
      >
        {/* Header Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 mb-3 md:mb-4 flex-shrink-0">
          {/* Cookie icon — gradient pill matching the brand signature
              gradient (indigo → violet → fuchsia). */}
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-violet-500/30 via-fuchsia-500/25 to-pink-500/30 border border-white/15 flex items-center justify-center text-violet-200 shadow-lg shadow-violet-500/20"
          >
            <Cookie size={24} className="md:hidden" aria-hidden="true" />
            <Cookie size={28} className="hidden md:block" aria-hidden="true" />
          </motion.div>

          <div className="flex-1 text-center md:text-left">
            <p className="text-white/90 font-bold text-xs md:text-base leading-relaxed">
              We use cookies to enhance your learning experience. By continuing to browse, you agree to our use of cookies.
            </p>
            <p className="hidden md:block text-white/50 text-xs mt-1 font-medium">
              EU-hosted • No third-party trackers • You can change this anytime in settings.
            </p>
          </div>
        </div>

        {/* Expandable Customization Panel - scrollable on mobile */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="overflow-hidden flex-shrink-0"
            >
              <div className="mb-4 md:mb-6 p-3 md:p-6 bg-white/5 rounded-xl md:rounded-2xl border border-white/10 overflow-y-auto max-h-[40vh] md:max-h-none">
                <h3 className="text-base md:text-lg font-black font-headline mb-3 md:mb-4 text-white">
                  Cookie Preferences
                </h3>
                <div className="space-y-2 md:space-y-3">
                  {cookieCategories.map((category) => {
                    const Icon = category.icon;
                    const isEnabled = preferences[category.id];
                    const isDisabled = category.required;

                    return (
                      <button
                        type="button"
                        key={category.id}
                        onClick={() => !isDisabled && togglePreference(category.id)}
                        disabled={isDisabled}
                        aria-pressed={isEnabled}
                        className={`group relative w-full text-start flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all focus:outline-none focus:ring-2 focus:ring-violet-400/60 ${
                          isDisabled
                            ? "bg-white/5 border-white/10 cursor-not-allowed"
                            : isEnabled
                            ? "bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10 border-violet-400/30 hover:border-violet-400/50 hover:from-violet-500/20 hover:to-fuchsia-500/15 cursor-pointer"
                            : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 cursor-pointer"
                        }`}
                      >
                        {/* Icon pill — violet container with the category icon, parallel to the cookie banner's hero icon style */}
                        <div className={`flex-shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center transition-all ${
                          isEnabled
                            ? "bg-gradient-to-br from-violet-500/30 via-fuchsia-500/25 to-pink-500/30 border border-white/20 shadow-lg shadow-violet-500/20"
                            : "bg-white/10 border border-white/15"
                        }`}>
                          <Icon size={18} className={isEnabled ? "text-violet-100" : "text-white/55"} aria-hidden="true" />
                        </div>

                        {/* Content — name + Required badge inline, description below */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 flex-wrap">
                            <span className="font-black text-white text-sm md:text-base">
                              {category.name}
                            </span>
                            {isDisabled && (
                              <span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase tracking-wider px-1.5 md:px-2 py-0.5 bg-violet-500/25 text-violet-100 border border-violet-400/40 rounded-full">
                                <Lock size={9} aria-hidden="true" />
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-xs md:text-sm text-white/65 leading-snug">
                            {category.description}
                          </p>
                        </div>

                        {/* Toggle switch on the RIGHT (iOS convention).  Larger
                            and more obviously interactive.  ON state = bright
                            gradient + glowing thumb; OFF state = dark slate
                            with dim thumb so the difference is unmistakable. */}
                        <div
                          aria-hidden="true"
                          className={`flex-shrink-0 w-11 h-6 md:w-14 md:h-8 rounded-full p-0.5 md:p-1 transition-all relative ${
                            isEnabled
                              ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-[inset_0_2px_6px_rgba(0,0,0,0.2),0_0_20px_rgba(167,139,250,0.45)]"
                              : "bg-slate-700/80 shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)]"
                          } ${isDisabled ? "opacity-90" : ""}`}
                        >
                          <div
                            className={`w-5 h-5 md:w-6 md:h-6 rounded-full shadow-lg transition-all ${
                              isEnabled
                                ? "bg-white translate-x-5 md:translate-x-6"
                                : "bg-slate-300 translate-x-0"
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full flex-shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 md:px-6 py-3 md:py-4 rounded-lg md:rounded-xl font-black text-xs md:text-sm text-white/85 bg-white/5 hover:bg-white/10 border-2 border-white/15 hover:border-white/25 transition-all flex items-center justify-center gap-1.5 md:gap-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={16} className="md:hidden" aria-hidden="true" />
                <ChevronUp size={18} className="hidden md:block" aria-hidden="true" />
                Less
              </>
            ) : (
              <>
                <ChevronDown size={16} className="md:hidden" aria-hidden="true" />
                <ChevronDown size={18} className="hidden md:block" aria-hidden="true" />
                Customize
              </>
            )}
          </button>

          {isExpanded ? (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSavePreferences()}
              className="signature-gradient px-6 md:px-8 py-3 md:py-4 rounded-lg md:rounded-xl font-black text-xs md:text-sm text-white shadow-[0_8px_30px_rgba(139,92,246,0.45)] hover:shadow-[0_12px_40px_rgba(139,92,246,0.6)] transition-shadow flex items-center justify-center gap-2"
            >
              <Check size={16} aria-hidden="true" />
              Save Preferences
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onAccept()}
              className="signature-gradient px-6 md:px-8 py-3 md:py-4 rounded-lg md:rounded-xl font-black text-xs md:text-sm text-white shadow-[0_8px_30px_rgba(139,92,246,0.45)] hover:shadow-[0_12px_40px_rgba(139,92,246,0.6)] transition-shadow flex items-center justify-center gap-2"
            >
              <Check size={16} aria-hidden="true" />
              Accept All
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CookieBanner;
