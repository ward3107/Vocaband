/**
 * Dynamic import utilities for heavy libraries
 * These libraries will only be loaded when needed, reducing initial bundle size
 */

// Lazy load Mammoth for document parsing
let mammothCache: any = null;
export const loadMammoth = async () => {
  if (mammothCache) return mammothCache;
  mammothCache = await import('mammoth');
  return mammothCache;
};

// Lazy load Socket.IO client
let socketIOCache: any = null;
export const loadSocketIO = async () => {
  if (socketIOCache) return socketIOCache;
  socketIOCache = await import('socket.io-client');
  return socketIOCache;
};

// Lazy load Canvas Confetti
let confettiCache: any = null;
export const loadConfetti = async () => {
  if (confettiCache) return confettiCache;
  confettiCache = await import('canvas-confetti');
  return confettiCache.default;
};

// Hook-based lazy loaders for React components
export const useLazyMammoth = () => {
  const [mammoth, setMammoth] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadMammoth().then(module => {
      setMammoth(module.default || module);
      setLoading(false);
    });
  }, []);

  return { mammoth, loading };
};

export const useLazySocketIO = () => {
  const [io, setIO] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadSocketIO().then(module => {
      setIO(module.default || module);
      setLoading(false);
    });
  }, []);

  return { io, loading };
};

export const useLazyConfetti = () => {
  const [confetti, setConfetti] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadConfetti().then(module => {
      setConfetti(() => module);
      setLoading(false);
    });
  }, []);

  return { confetti, loading };
};

// Import React for the hooks
import React from 'react';
