import React from "react";
import { Home, Shield, Scale, Accessibility } from "lucide-react";

interface MobileNavProps {
  currentPage: "home" | "terms" | "privacy";
  onNavigate: (page: "home" | "terms" | "privacy") => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ currentPage, onNavigate }) => {
  const navItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "privacy" as const, label: "Privacy", icon: Shield },
    { id: "terms" as const, label: "Terms", icon: Scale },
  ];

  return (
    <nav dir="ltr" className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 pb-4 pt-2 bg-stone-100/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.04)] rounded-t-[2rem]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center p-2 transition-all ${
              isActive
                ? "bg-primary text-white rounded-full scale-105 shadow-md shadow-blue-500/30"
                : "text-stone-400"
            }`}
          >
            <Icon size={20} />
            <span className="text-[9px] font-black font-headline mt-0.5">
              {item.label}
            </span>
          </button>
        );
      })}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-a11y-panel'))}
        aria-label="Open accessibility options"
        className="flex flex-col items-center justify-center p-2 bg-primary text-white rounded-full shadow-md shadow-blue-500/30 transition-all"
      >
        <Accessibility size={20} />
        <span className="text-[9px] font-black font-headline mt-0.5">A11y</span>
      </button>
    </nav>
  );
};

export default MobileNav;
