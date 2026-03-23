import React from "react";
import { Home, Gamepad2, Shield, Scale } from "lucide-react";

interface MobileNavProps {
  currentPage: "home" | "terms" | "privacy" | "playground";
  onNavigate: (page: "home" | "terms" | "privacy" | "playground") => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ currentPage, onNavigate }) => {
  const navItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "playground" as const, label: "Play", icon: Gamepad2 },
    { id: "privacy" as const, label: "Privacy", icon: Shield },
    { id: "terms" as const, label: "Terms", icon: Scale },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 pb-4 pt-2 bg-white/90 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.04)] rounded-t-[2rem]">
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
    </nav>
  );
};

export default MobileNav;
