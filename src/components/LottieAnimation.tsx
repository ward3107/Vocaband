import React, { useRef, useState, useEffect } from 'react';
import { useLottie } from 'lottie-react';
import type { AnimationItem } from 'lottie-web';

interface LottieAnimationProps {
  src: string;
  alt: string;
  className?: string;
  size?: number;
  hoverPlay?: boolean; // Pause by default, play on hover
  slowMotion?: boolean; // Play at reduced speed for subtle effect
}

/**
 * Reusable Lottie animation component with hybrid behavior:
 * - Loads animation from URL
 * - Auto-plays at reduced speed (subtle background effect)
 * - On hover: full-speed playback + slight scale
 * - Accessible with proper ARIA labels
 */
export const LottieAnimation: React.FC<LottieAnimationProps> = ({
  src,
  alt,
  className = '',
  size = 200,
  hoverPlay = false,
  slowMotion = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [animationData, setAnimationData] = useState<any>(null);
  const lottieRef = useRef<AnimationItem | null>(null);

  // Load animation from URL
  useEffect(() => {
    fetch(src)
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error('Failed to load Lottie:', err));
  }, [src]);

  // Update speed based on hover state
  useEffect(() => {
    if (lottieRef.current) {
      const speed = slowMotion ? (isHovered ? 1 : 0.3) : (isHovered ? 1.5 : 1);
      lottieRef.current.setSpeed(speed);
    }
  }, [isHovered, slowMotion]);

  // Handle hover play/pause
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (hoverPlay && lottieRef.current) {
      lottieRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (hoverPlay && lottieRef.current) {
      lottieRef.current.pause();
    }
  };

  // Use useLottie hook
  const options = {
    animationData: animationData,
    loop: !hoverPlay,
    autoplay: !hoverPlay,
  };

  const { View } = useLottie(options, lottieRef);

  // Show loading state or nothing while loading
  if (!animationData) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        role="img"
        aria-label={alt}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        transition: 'transform 0.3s ease-out',
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="img"
      aria-label={alt}
    >
      {View}
    </div>
  );
};

export default LottieAnimation;
