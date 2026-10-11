import type { Request, RequestHandler } from 'express';

// This is process liveness, not dependency readiness. A quota failure in Redis
// must not make Fly remove every machine and reject even WebSocket upgrades.
// Expensive /api/health/* diagnostics remain rate limited.
export function isLivenessRequest(req: Pick<Request, 'method' | 'path'>): boolean {
  return (req.method === 'GET' || req.method === 'HEAD')
    && (req.path === '/api/health' || req.path === '/api/health/');
}

export function livenessHandler(isDraining: () => boolean): RequestHandler {
  return (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(isDraining() ? 503 : 200).json({
      status: isDraining() ? 'draining' : 'ok',
      timestamp: new Date().toISOString(),
    });
  };
}
