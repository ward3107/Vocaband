import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";

// Supabase admin client — uses the service role key to verify tokens server-side
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verifyToken(token: string): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:3000";
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigin,
    },
  });

  const PORT = process.env.PORT || 3000;

  // Security headers — applied in production only (Vite dev server handles its own headers)
  if (process.env.NODE_ENV === "production") {
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co", allowedOrigin],
          frameSrc: ["https://accounts.google.com"],
        },
      },
      // Cloudflare handles HSTS at the edge, but set it here too as a belt-and-suspenders measure
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }));

    // Trust Cloudflare/Render proxy so req.ip reflects the real client IP for rate limiting
    app.set("trust proxy", 1);
  }

  // Rate limit: max 60 requests per minute per IP for general HTTP traffic
  const httpLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });
  app.use(httpLimiter);

  // Rate limit socket connections: track join-challenge attempts per IP
  const socketJoinAttempts: Record<string, { count: number; resetAt: number }> = {};
  const SOCKET_RATE_WINDOW = 60 * 1000; // 1 minute
  const SOCKET_RATE_MAX = 10; // max 10 join attempts per minute per IP

  // Live Challenge State
  // { classCode: { studentUid: { name, score } } }
  const liveSessions: Record<string, Record<string, { name: string, score: number }>> = {};
  // Track which session each socket belongs to for cleanup
  const socketSessions: Record<string, { classCode: string, uid: string }> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-challenge", async ({ classCode, name, uid, token }) => {
      if (
        typeof classCode !== "string" || classCode.length === 0 || classCode.length > 64 ||
        typeof name !== "string" || name.length === 0 || name.length > 100 ||
        typeof uid !== "string" || uid.length === 0 || uid.length > 128 ||
        typeof token !== "string" || token.length === 0
      ) return;

      // Rate limit join-challenge by client IP
      const clientIp = socket.handshake.headers["x-forwarded-for"] as string || socket.handshake.address;
      const now = Date.now();
      const ipRecord = socketJoinAttempts[clientIp];
      if (ipRecord && now < ipRecord.resetAt) {
        if (ipRecord.count >= SOCKET_RATE_MAX) return;
        ipRecord.count++;
      } else {
        socketJoinAttempts[clientIp] = { count: 1, resetAt: now + SOCKET_RATE_WINDOW };
      }

      // Verify Firebase ID token and confirm uid matches
      const verifiedUid = await verifyToken(token);
      if (!verifiedUid || verifiedUid !== uid) return;

      socket.join(classCode);
      socketSessions[socket.id] = { classCode, uid };
      if (!liveSessions[classCode]) {
        liveSessions[classCode] = {};
      }
      liveSessions[classCode][uid] = { name, score: 0 };
      io.to(classCode).emit("leaderboard-update", liveSessions[classCode]);
    });

    socket.on("update-score", ({ classCode, uid, score }) => {
      if (
        typeof classCode !== "string" || classCode.length === 0 || classCode.length > 64 ||
        typeof uid !== "string" || uid.length === 0 || uid.length > 128 ||
        typeof score !== "number" || !isFinite(score) || score < 0
      ) return;

      // Only allow the socket that joined with this uid to update its own score
      const session = socketSessions[socket.id];
      if (!session || session.classCode !== classCode || session.uid !== uid) return;

      if (liveSessions[classCode] && liveSessions[classCode][uid]) {
        liveSessions[classCode][uid].score = score;
        io.to(classCode).emit("leaderboard-update", liveSessions[classCode]);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
      const session = socketSessions[socket.id];
      if (session) {
        const { classCode, uid } = session;
        if (liveSessions[classCode]) {
          delete liveSessions[classCode][uid];
          if (Object.keys(liveSessions[classCode]).length === 0) {
            delete liveSessions[classCode];
          } else {
            io.to(classCode).emit("leaderboard-update", liveSessions[classCode]);
          }
        }
        delete socketSessions[socket.id];
      }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));

    // Serve sitemap.xml with explicit XML content type so search engines
    // don't mistake it for an HTML page (the catch-all below returns HTML).
    app.get("/sitemap.xml", (_req, res) => {
      res.type("application/xml").sendFile(path.join(distPath, "sitemap.xml"));
    });

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
