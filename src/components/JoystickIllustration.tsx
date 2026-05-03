import React from 'react';
import { motion } from 'motion/react';

interface JoystickIllustrationProps {
  className?: string;
  size?: number;
}

export const JoystickIllustration: React.FC<JoystickIllustrationProps> = ({ className = '', size = 80 }) => {
  const scale = size / 80;

  return (
    <div className={className} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Base circular housing */}
        <circle cx="50" cy="55" r="35" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />

        {/* Directional indicators (dots) */}
        {[
          { x: 50, y: 28 },  // top
          { x: 72, y: 43 },  // top-right
          { x: 78, y: 55 },  // right
          { x: 72, y: 67 },  // bottom-right
          { x: 50, y: 82 },  // bottom
          { x: 28, y: 67 },  // bottom-left
          { x: 22, y: 55 },  // left
          { x: 28, y: 43 },  // top-left
        ].map((pos, i) => (
          <circle
            key={i}
            cx={pos.x}
            cy={pos.y}
            r="2.5"
            fill="rgba(255,255,255,0.4)"
          />
        ))}

        {/* Center dome */}
        <circle cx="50" cy="55" r="18" fill="rgba(255,255,255,0.2)" />

        {/* Joystick stick - circular top */}
        <motion.g
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Stick shaft */}
          <rect x="46" y="40" width="8" height="20" rx="2" fill="rgba(255,255,255,0.5)" />
          {/* Circular top */}
          <circle cx="50" cy="35" r="12" fill="rgba(255,255,255,0.8)" />
          {/* Grip lines on top */}
          <circle cx="50" cy="35" r="8" fill="none" stroke="rgba(139,92,246,0.6)" strokeWidth="1.5" />
        </motion.g>

        {/* Three floating objects beside joystick */}
        <g>
          {/* Object 1 - Star */}
          <motion.g
            animate={{ y: [0, -4, 0], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <polygon points="85,15 87,20 92,20 88,24 90,29 85,26 80,29 82,24 78,20 83,20" fill="#FFD700" />
          </motion.g>

          {/* Object 2 - Diamond */}
          <motion.g
            animate={{ y: [0, -5, 0], rotate: [0, 180, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <rect x="82" y="40" width="10" height="10" rx="1" transform="rotate(45 87 45)" fill="#00D9FF" />
          </motion.g>

          {/* Object 3 - Circle with pulse */}
          <motion.g
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            <motion.circle
              cx="87" cy="65" r="5"
              fill="#FF6B6B"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.g>
        </g>
      </svg>
    </div>
  );
};

export default JoystickIllustration;
