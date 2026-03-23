import React, { useState } from "react";
import { Cookie, ChevronUp, ChevronDown, Shield, BarChart3, Settings } from "lucide-react";

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
    <div className="fixed bottom-0 left-0 w-full z-[100] px-4 pb-8 md:px-8 md:pb-12 pointer-events-none">
      <div className="max-w-4xl mx-auto bg-surface-container-lowest/90 backdrop-blur-2xl p-6 md:p-8 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] pointer-events-auto border border-surface-container-high/50">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
          <div className="flex-shrink-0 w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Cookie size={28} />
          </div>

          <div className="flex-1 text-center md:text-left">
            <p className="text-on-surface-variant font-bold text-sm md:text-base leading-relaxed">
              We use cookies to enhance your learning experience. By continuing to browse, you agree to our use of cookies.
            </p>
          </div>
        </div>

        {/* Expandable Customization Panel */}
        {isExpanded && (
          <div className="mb-6 p-4 md:p-6 bg-surface-container-low rounded-2xl border border-surface-container-high/50">
            <h3 className="text-lg font-black font-headline mb-4 text-on-surface">
              Cookie Preferences
            </h3>
            <div className="space-y-4">
              {cookieCategories.map((category) => {
                const Icon = category.icon;
                const isEnabled = preferences[category.id];
                const isDisabled = category.required;

                return (
                  <div
                    key={category.id}
                    className={`flex items-start gap-4 p-4 rounded-xl transition-all ${
                      isDisabled
                        ? "bg-surface-container/50"
                        : "bg-surface-container-lowest hover:bg-surface-container/30 cursor-pointer"
                    }`}
                    onClick={() => !isDisabled && togglePreference(category.id)}
                  >
                    {/* Toggle Switch */}
                    <div
                      className={`flex-shrink-0 w-12 h-7 rounded-full p-1 transition-all ${
                        isEnabled
                          ? "bg-primary"
                          : "bg-surface-container-high"
                      } ${isDisabled ? "opacity-60" : ""}`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                          isEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={16} className="text-on-surface-variant" />
                        <span className="font-black text-on-surface">
                          {category.name}
                        </span>
                        {isDisabled && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-on-surface-variant">
                        {category.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-6 py-4 rounded-xl font-black text-sm text-on-surface border-2 border-outline-variant/20 hover:bg-surface-container-low transition-all flex items-center justify-center gap-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={18} />
                Less Options
              </>
            ) : (
              <>
                <ChevronDown size={18} />
                Customize
              </>
            )}
          </button>

          {isExpanded ? (
            <button
              onClick={handleSavePreferences}
              className="signature-gradient px-8 py-4 rounded-xl font-black text-sm text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
            >
              Save Preferences
            </button>
          ) : (
            <button
              onClick={onAccept}
              className="signature-gradient px-8 py-4 rounded-xl font-black text-sm text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
            >
              Accept All
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
