/**
 * Dynamic import utilities for heavy libraries
 * These libraries will only be loaded when needed, reducing initial bundle size
 */

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
