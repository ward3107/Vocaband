import React, { useState, useEffect } from "react";
import { Home, Gamepad2, Shield, Scale, MessageCircle, ArrowUp } from "lucide-react";

interface MobileNavProps {
  currentPage: "home" | "terms" | "privacy" | "playground";
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ currentPage, onNavigate }) => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent("Check out Vocaband - the fun way to master English vocabulary!");
    const url = encodeURIComponent(window.location.href);
    window.open(`https://wa.me/?text=${text}%20${url}`, "_blank");
  };

  const navItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "playground" as const, label: "Play", icon: Gamepad2 },
    { id: "privacy" as const, label: "Privacy", icon: Shield },
    { id: "terms" as const, label: "Terms", icon: Scale },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 pb-6 pt-2 bg-white/90 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.04)] rounded-t-[3rem]">
      {/* WhatsApp */}
      <button
        onClick={shareOnWhatsApp}
        className="flex flex-col items-center justify-center p-3 text-stone-400 hover:text-green-500 transition-all"
        title="Share on WhatsApp"
      >
        <MessageCircle size={22} />
        <span className="text-[10px] font-black font-headline mt-1">Share</span>
      </button>

      {navItems.slice(0, 2).map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center p-3 transition-all ${
              isActive
                ? "bg-primary text-white rounded-full scale-110 shadow-lg shadow-blue-500/30"
                : "text-stone-400"
            }`}
          >
            <Icon size={22} />
            <span className="text-[10px] font-black font-headline mt-1">
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Back to Top - only shows when scrolled */}
      {showBackToTop ? (
        <button
          onClick={scrollToTop}
          className="flex flex-col items-center justify-center p-3 text-stone-400 hover:text-primary transition-all"
          title="Back to top"
        >
          <ArrowUp size={22} />
          <span className="text-[10px] font-black font-headline mt-1">Top</span>
        </button>
      ) : (
        <button
          onClick={() => onNavigate("privacy")}
          className={`flex flex-col items-center justify-center p-3 transition-all ${
            currentPage === "privacy"
              ? "bg-primary text-white rounded-full scale-110 shadow-lg shadow-blue-500/30"
              : "text-stone-400"
          }`}
        >
          <Shield size={22} />
          <span className="text-[10px] font-black font-headline mt-1">Privacy</span>
        </button>
      )}
    </nav>
  );
};

export default MobileNav;
