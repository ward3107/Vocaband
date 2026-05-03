import React from 'react';

interface CssAnimationProps {
  type: 'hero' | 'game' | 'analytics' | 'book' | 'trophy' | 'robot' | 'chart' | 'qr' | 'fire' | 'avatar' | 'class' | 'keyboard' | 'podium';
  size?: number;
  className?: string;
}

const animations = {
  hero: { emoji: '📚', gradient: 'from-violet-500 to-indigo-500' },
  game: { emoji: '🎮', gradient: 'from-fuchsia-500 to-pink-500' },
  analytics: { emoji: '📊', gradient: 'from-emerald-500 to-teal-500' },
  book: { emoji: '📖', gradient: 'from-amber-500 to-orange-500' },
  trophy: { emoji: '🏆', gradient: 'from-yellow-500 to-amber-500' },
  robot: { emoji: '🤖', gradient: 'from-blue-500 to-cyan-500' },
  chart: { emoji: '📈', gradient: 'from-emerald-500 to-teal-500' },
  qr: { emoji: '📱', gradient: 'from-purple-500 to-violet-500' },
  fire: { emoji: '🔥', gradient: 'from-orange-500 to-red-500' },
  avatar: { emoji: '👤', gradient: 'from-indigo-500 to-purple-500' },
  class: { emoji: '👥', gradient: 'from-blue-500 to-indigo-500' },
  keyboard: { emoji: '⌨️', gradient: 'from-gray-500 to-slate-600' },
  podium: { emoji: '🥇', gradient: 'from-yellow-400 to-amber-500' },
};

export const CssAnimation: React.FC<CssAnimationProps> = ({
  type,
  size = 80,
  className = '',
}) => {
  const config = animations[type];

  return (
    <div
      className={`relative flex items-center justify-center bg-gradient-to-br ${config.gradient} rounded-full shadow-lg ${className}`}
      style={{
        width: size,
        height: size,
        animation: 'float 3s ease-in-out infinite',
      }}
    >
      <span
        className="text-white"
        style={{
          fontSize: size * 0.5,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
        }}
      >
        {config.emoji}
      </span>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

export default CssAnimation;
