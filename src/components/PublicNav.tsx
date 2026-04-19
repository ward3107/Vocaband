import React from "react";
import { Gamepad2 } from "lucide-react";
import { motion } from "motion/react";

interface PublicNavProps {
  currentPage: "home" | "terms" | "privacy";
  onNavigate: (page: "home" | "terms" | "privacy") => void;
  onGetStarted: () => void;
  onTryDemo?: () => void;
}

const PublicNav: React.FC<PublicNavProps> = ({
  currentPage,
  onNavigate,
  onGetStarted,
  onTryDemo,
}) => {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-stone-100/80 backdrop-blur-md flex justify-between items-center px-4 md:px-6 py-2 border-b border-stone-200/50">
      <button
        onClick={() => onNavigate("home")}
        className="flex items-center gap-2"
      >
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg signature-gradient flex items-center justify-center shadow-md shadow-primary/20">
          <span className="text-white text-base md:text-lg font-black font-headline italic">V</span>
        </div>
        <span className="text-lg md:text-xl font-black text-primary font-headline tracking-tight">
          Vocaband
        </span>
        <span className="hidden md:inline-block px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest rounded-full">
          CEFR A1–B2
        </span>
      </button>

      <div className="flex items-center gap-2 md:gap-3">
        {onTryDemo && (
          <motion.button
            onClick={onTryDemo}
            animate={{
              y: [0, -4, 0],
              scale: [1, 1.03, 1],
            }}
            transition={{
              y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              rotateZ: { duration: 0.3, repeat: Infinity },
            }}
            whileHover={{
              scale: 1.1,
              rotateZ: [-3, 3, -3],
              boxShadow: "0 0 30px rgba(0, 80, 212, 0.7), 0 0 60px rgba(147, 51, 234, 0.4)"
            }}
            whileTap={{ scale: 0.95 }}
            className="relative bg-gradient-to-r from-primary via-violet-600 to-fuchsia-600 text-white text-sm font-black px-5 py-2.5 md:px-6 md:py-3 rounded-full shadow-2xl shadow-primary/50 hover:shadow-primary/70 flex items-center gap-2 border-2 border-white/40 overflow-hidden"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Pulsing glow ring */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-fuchsia-600"
            />

            {/* 3D depth shadow layers */}
            <div className="absolute inset-0 bg-black/30 rounded-full transform translate-y-1 translate-x-1" />
            <div className="absolute inset-0 bg-black/15 rounded-full transform translate-y-0.5 translate-x-0.5" />

            {/* Animated shine sweep */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
            />

            {/* Rotating gamepad icon */}
            <motion.div
              animate={{ rotateY: [0, 360], rotateZ: [0, 10, 0, -10, 0] }}
              transition={{
                rotateY: { duration: 3, repeat: Infinity, ease: "linear" },
                rotateZ: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
              }}
              className="relative z-10"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <Gamepad2 size={18} strokeWidth={3} />
            </motion.div>

            <span className="hidden sm:inline relative z-10 text-sm md:text-base">TRY DEMO</span>
            <span className="sm:hidden relative z-10 text-xs">DEMO</span>

            {/* Sparkle effects */}
            <motion.span
              animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              className="absolute -top-1 -right-1 text-yellow-300"
            >✨</motion.span>
            <motion.span
              animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              className="absolute -bottom-1 -left-1 text-yellow-300"
            >✨</motion.span>
          </motion.button>
        )}
      </div>
    </nav>
  );
};

export default PublicNav;
