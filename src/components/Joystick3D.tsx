import React from 'react';
import { motion } from 'motion/react';

interface Joystick3DProps {
  className?: string;
  size?: number;
}

/**
 * 3D Joystick illustration with depth, shadows, and perspective
 */
export const Joystick3D: React.FC<Joystick3DProps> = ({ className = '', size = 120 }) => {
  return (
    <div className={className} style={{ width: size, height: size, perspective: '500px' }}>
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateX: [-5, 5, -5], rotateY: [-5, 5, -5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 140 120" className="w-full h-full" style={{ transform: 'translateZ(20px)' }}>
          <defs>
            {/* 3D Base gradient */}
            <radialGradient id="base3d" cx="40%" cy="40%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
            </radialGradient>

            {/* Shadow gradient */}
            <radialGradient id="shadowGrad" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(0,0,0,0.5)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>

            {/* Stick metallic gradient */}
            <linearGradient id="stickMetal" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#666" />
              <stop offset="50%" stopColor="#999" />
              <stop offset="100%" stopColor="#666" />
            </linearGradient>

            {/* Top ball gradient */}
            <radialGradient id="ball3d" cx="35%" cy="35%">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="50%" stopColor="#ddd" />
              <stop offset="100%" stopColor="#888" />
            </radialGradient>
          </defs>

          {/* Drop shadow */}
          <ellipse cx="55" cy="95" rx="40" ry="10" fill="url(#shadowGrad)" opacity="0.6" />

          {/* Base plate (bottom layer) */}
          <ellipse cx="55" cy="85" rx="40" ry="12" fill="#444" opacity="0.5" />

          {/* Base housing - 3D cylinder effect */}
          <ellipse cx="55" cy="82" rx="38" ry="36" fill="url(#base3d)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />

          {/* Inner recess */}
          <ellipse cx="55" cy="80" rx="28" ry="26" fill="rgba(0,0,0,0.3)" />

          {/* Directional indicators - raised bumps */}
          {[
            { x: 55, y: 52, r: 4 },  // top
            { x: 82, y: 68, r: 4 },  // right
            { x: 55, y: 106, r: 4 }, // bottom
            { x: 28, y: 68, r: 4 },  // left
          ].map((pos, i) => (
            <circle key={i} cx={pos.x} cy={pos.y} r={pos.r} fill="rgba(255,255,255,0.4)" />
          ))}

          {/* Diagonal dots */}
          {[
            { x: 76, y: 56, r: 2 },
            { x: 88, y: 80, r: 2 },
            { x: 76, y: 102, r: 2 },
            { x: 34, y: 56, r: 2 },
            { x: 22, y: 80, r: 2 },
            { x: 34, y: 102, r: 2 },
          ].map((pos, i) => (
            <circle key={i} cx={pos.x} cy={pos.y} r={pos.r} fill="rgba(255,255,255,0.3)" />
          ))}

          {/* Center dome */}
          <ellipse cx="55" cy="80" rx="18" ry="16" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

          {/* Joystick shaft - 3D cylinder */}
          <motion.g
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Shaft shadow */}
            <rect x="49" y="55" width="12" height="25" rx="3" fill="rgba(0,0,0,0.3)" />
            {/* Shaft */}
            <rect x="48" y="52" width="14" height="25" rx="3" fill="url(#stickMetal)" />
            {/* Shaft highlight */}
            <rect x="50" y="52" width="3" height="25" rx="1" fill="rgba(255,255,255,0.4)" />
          </motion.g>

          {/* Joystick ball top - 3D sphere */}
          <motion.g
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Ball shadow on base */}
            <ellipse cx="55" cy="58" rx="14" ry="4" fill="rgba(0,0,0,0.2)" />

            {/* Ball */}
            <circle cx="55" cy="45" r="15" fill="url(#ball3d)" stroke="#666" strokeWidth="1" />

            {/* Ball highlight */}
            <ellipse cx="49" cy="39" rx="6" ry="4" fill="rgba(255,255,255,0.6)" />

            {/* Grip ring texture */}
            <circle cx="55" cy="45" r="11" fill="none" stroke="#888" strokeWidth="1" opacity="0.5" />
          </motion.g>

          {/* THREE FLOATING OBJECTS - larger and more visible */}
          <g style={{ transform: 'translateZ(40px)' }}>
            {/* 1. GOLD STAR - Top right */}
            <motion.g
              animate={{ y: [0, -8, 0], rotate: [0, 20, -20, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Star glow */}
              <circle cx="115" cy="20" r="14" fill="rgba(255,215,0,0.3)" />
              {/* Star shadow */}
              <polygon points="115,14 117,21 124,21 118,26 121,33 115,29 109,33 112,26 106,21 113,21" fill="rgba(0,0,0,0.3)" transform="translate(2,2)" />
              {/* Star */}
              <polygon
                points="115,12 117,19 124,19 118,24 121,31 115,27 109,31 112,24 106,19 113,19"
                fill="#FFD700"
                stroke="#FFA500"
                strokeWidth="1"
              />
              {/* Star highlight */}
              <polygon points="115,16 117,20 120,20 117,23 119,27 115,24 111,27 113,23 110,20 113,20" fill="rgba(255,255,255,0.5)" />
            </motion.g>

            {/* 2. BLUE DIAMOND - Middle right */}
            <motion.g
              animate={{ y: [0, -10, 0], rotate: [0, 180, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              {/* Diamond glow */}
              <circle cx="120" cy="55" r="12" fill="rgba(0,217,255,0.3)" />
              {/* Diamond shadow */}
              <rect x="112" y="50" width="16" height="16" rx="2" transform="rotate(45 120 58)" fill="rgba(0,0,0,0.3)" />
              {/* Diamond back */}
              <polygon points="120,47 128,55 120,71 112,55" fill="#0099AA" />
              {/* Diamond front */}
              <polygon points="120,47 128,55 120,63 112,55" fill="#00D9FF" />
              {/* Diamond highlight */}
              <polygon points="120,47 125,53 120,57 115,53" fill="rgba(255,255,255,0.6)" />
            </motion.g>

            {/* 3. RED SPHERE - Bottom right */}
            <motion.g
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              {/* Sphere glow */}
              <circle cx="118" cy="85" r="10" fill="rgba(255,107,107,0.3)" />
              {/* Sphere shadow */}
              <ellipse cx="120" cy="92" rx="9" ry="4" fill="rgba(0,0,0,0.3)" />
              <motion.g
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {/* Sphere */}
                <circle cx="118" cy="85" r="9" fill="#FF6B6B" />
                {/* Highlight */}
                <ellipse cx="114" cy="81" rx="4" ry="3" fill="rgba(255,255,255,0.6)" />
                {/* Shine */}
                <circle cx="120" cy="88" r="2" fill="rgba(255,255,255,0.3)" />
              </motion.g>
            </motion.g>
          </g>
        </svg>
      </motion.div>
    </div>
  );
};

export default Joystick3D;
