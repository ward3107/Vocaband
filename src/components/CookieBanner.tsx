import React from "react";
import { Cookie } from "lucide-react";

interface CookieBannerProps {
  onAccept: () => void;
  onCustomize: () => void;
}

const CookieBanner: React.FC<CookieBannerProps> = ({ onAccept, onCustomize }) => {
  return (
    <div className="fixed bottom-0 left-0 w-full z-[100] px-4 pb-8 md:px-8 md:pb-12 pointer-events-none">
      <div className="max-w-4xl mx-auto bg-surface-container-lowest/90 backdrop-blur-2xl p-6 md:p-8 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] pointer-events-auto border border-surface-container-high/50 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-shrink-0 w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <Cookie size={28} />
        </div>

        <div className="flex-1 text-center md:text-left">
          <p className="text-on-surface-variant font-bold text-sm md:text-base leading-relaxed">
            We use cookies to enhance your learning experience. By continuing to browse, you agree to our use of cookies.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={onCustomize}
            className="px-6 py-4 rounded-xl font-black text-sm text-on-surface border-2 border-outline-variant/20 hover:bg-surface-container-low transition-all"
          >
            Customize
          </button>
          <button
            onClick={onAccept}
            className="signature-gradient px-8 py-4 rounded-xl font-black text-sm text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
