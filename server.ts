import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import { LeaderboardEntry, SOCKET_EVENTS, type JoinChallengePayload, type ObserveChallengePayload, type UpdateScorePayload } from "./src/core/types.js";
import { isValidClassCode, isValidName, isValidUid, isValidToken, createSocketRateLimiter } from "./src/server-utils.js";

// Validate required environment variables before starting
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

// Supabase admin client — uses the service role key to verify tokens server-side
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verifyToken(token: string): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error) {
      console.warn("Token verification failed:", error.message);
      return null;
    }
    if (!user) {
      console.warn("Token verification: no user returned");
      return null;
    }
    return user.id;
  } catch (err) {
    console.error("Token verification exception:", err);
    return null;
  }
}

type UserRole = "teacher" | "student" | "admin";

async function getUserRoleAndClass(uid: string): Promise<{ role: UserRole; classCode: string | null } | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("role, class_code")
      .eq("uid", uid)
      .maybeSingle();
    if (error || !data) return null;
    return {
      role: data.role as UserRole,
      classCode: data.class_code ?? null,
    };
  } catch {
    return null;
  }
}

async function isTeacherForClass(uid: string, classCode: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from("classes")
      .select("id")
      .eq("teacher_uid", uid)
      .eq("code", classCode)
      .maybeSingle();
    return !error && !!data;
  } catch {
    return false;
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

  // Security middleware — applied in production only (Vite dev server handles its own headers)
  if (process.env.NODE_ENV === "production") {
    // Trust proxy so req.ip reflects the real client IP behind Cloudflare/Render
    app.set("trust proxy", 1);

    // Security headers via helmet
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],  // unsafe-inline needed for motion library animation styles; fonts.googleapis.com for Google Fonts CSS
          fontSrc: ["'self'", "fonts.gstatic.com"],  // gstatic.com serves the actual font files
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co", allowedOrigin],
          frameSrc: ["https://accounts.google.com"],
          workerSrc: ["'self'", "blob:"],
        },
      },
      // Cloudflare handles HSTS at the edge, but set it here too as a belt-and-suspenders measure
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }));

    // Rate limit page/API requests per IP — skip static assets (JS/CSS/images/fonts)
    // so a classroom of 100+ students behind one IP can all load the app smoothly
    app.use(rateLimit({
      windowMs: 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests, please try again later." },
      skip: (req) => /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|webp|map)$/i.test(req.path),
    }));
  }

  // Rate limit socket joins by AUTHENTICATED USER ID (not IP).
  // This way 100+ students behind the same school WiFi aren't blocked.
  // A lightweight IP-based pre-auth limiter still stops unauthenticated flooding.
  const preAuthIpLimiter = createSocketRateLimiter(
    60 * 1000, // 1 minute window
    200,       // generous — only catches raw flooding from a single IP
    60 * 1000  // cleanup every minute
  );
  const perUserLimiter = createSocketRateLimiter(
    60 * 1000, // 1 minute window
    5,         // each user gets max 5 join attempts per minute (reconnects)
    60 * 1000  // cleanup every minute
  );

  // Per-socket rate limiter for score updates (max 2 per second per socket)
  const scoreUpdateLimiter = createSocketRateLimiter(
    1000,      // 1 second window
    2,         // max 2 updates per second
    30 * 1000  // cleanup every 30s
  );

  // Per-user rate limiter for observe events (max 5 per minute per user)
  const observeLimiter = createSocketRateLimiter(
    60 * 1000, // 1 minute window
    5,         // max 5 observe attempts per minute
    60 * 1000  // cleanup every minute
  );

  // Constants for score fetching
  const PROGRESS_RECORD_LIMIT = 1000; // Safety limit for student progress records

  // Live Challenge State
  // { classCode: { studentUid: { name, baseScore, currentGameScore } } }
  // baseScore: total from all past assignments (fetched from Supabase)
  // currentGameScore: points in the current active game
  const liveSessions: Record<string, Record<string, LeaderboardEntry>> = {};
  // Track which session each socket belongs to for cleanup
  const socketSessions: Record<string, { classCode: string, uid: string }> = {};
  // Reference count: how many sockets each uid has in each class (handles multi-tab)
  const socketRefCounts: Record<string, number> = {}; // key: "classCode:uid"

  // Throttled leaderboard broadcast — batches rapid score updates so the server
  // emits at most once every BROADCAST_INTERVAL_MS per class instead of once per
  // answer.  Keeps the leaderboard snappy without flooding 40 sockets per keystroke.
  const BROADCAST_INTERVAL_MS = 1500;
  const pendingBroadcasts = new Set<string>();
  let broadcastTimer: ReturnType<typeof setInterval> | null = null;

  function scheduleBroadcast(classCode: string) {
    pendingBroadcasts.add(classCode);
    if (!broadcastTimer) {
      broadcastTimer = setInterval(() => {
        for (const code of pendingBroadcasts) {
          if (liveSessions[code]) {
            io.to(code).emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, liveSessions[code]);
          }
        }
        pendingBroadcasts.clear();
        if (broadcastTimer) {
          clearInterval(broadcastTimer);
          broadcastTimer = null;
        }
      }, BROADCAST_INTERVAL_MS);
    }
  }

  // Helper: extract client IP from socket, respecting trust proxy in production
  function getSocketIp(socket: import("socket.io").Socket): string {
    if (process.env.NODE_ENV === "production") {
      const fwd = socket.handshake.headers["x-forwarded-for"];
      if (typeof fwd === "string") {
        const firstIp = fwd.split(",")[0].trim();
        // Basic IPv4/IPv6 format validation
        if (/^[\d.:a-fA-F]+$/.test(firstIp)) return firstIp;
      }
    }
    return socket.handshake.address || "0.0.0.0";
  }

  // Socket.IO connection-level auth middleware — reject unauthenticated connections early
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || token.length === 0) {
      return next(new Error("Authentication required"));
    }
    const uid = await verifyToken(token);
    if (!uid) {
      return next(new Error("Invalid token"));
    }
    // Attach verified uid to socket data for use in event handlers
    (socket.data as { uid: string }).uid = uid;
    next();
  });

  io.on("connection", (socket) => {
    const clientIp = getSocketIp(socket);

    socket.on(SOCKET_EVENTS.JOIN_CHALLENGE, async ({ classCode, name, uid, token }: JoinChallengePayload) => {
      if (!isValidClassCode(classCode) || !isValidName(name) || !isValidUid(uid) || !isValidToken(token)) return;

      // Pre-auth IP limiter: stops raw flooding before we hit Supabase
      if (!preAuthIpLimiter.checkLimit(clientIp)) return;

      // Verify Supabase JWT and confirm uid matches
      const verifiedUid = await verifyToken(token);
      if (!verifiedUid || verifiedUid !== uid) return;

      // Post-auth per-user limiter: each authenticated user gets 5 joins/min
      if (!perUserLimiter.checkLimit(verifiedUid)) return;

      const userData = await getUserRoleAndClass(uid);
      if (!userData) return;

      // Only class members (students) or teachers who own the class can join.
      const canJoinAsStudent = userData.role === "student" && userData.classCode === classCode;
      const canJoinAsTeacher = userData.role === "teacher" && await isTeacherForClass(uid, classCode);
      if (!canJoinAsStudent && !canJoinAsTeacher) return;

      // Fetch student's score for THIS class only (not cross-class)
      let totalScore = 0;
      try {
        const { data, error } = await supabaseAdmin
          .from("progress")
          .select("score")
          .eq("student_uid", uid)
          .eq("class_code", classCode)
          .limit(PROGRESS_RECORD_LIMIT);
        if (!error && data) {
          // Aggregate in JavaScript (consider using SQL RPC for very large datasets)
          totalScore = data.reduce((sum, record) => sum + (record.score || 0), 0);
        }
      } catch (err) {
        console.error("Error fetching student score:", err);
      }

      socket.join(classCode);
      socketSessions[socket.id] = { classCode, uid };
      const refKey = `${classCode}:${uid}`;
      socketRefCounts[refKey] = (socketRefCounts[refKey] || 0) + 1;
      if (!liveSessions[classCode]) {
        liveSessions[classCode] = {};
      }
      liveSessions[classCode][uid] = { name, baseScore: totalScore, currentGameScore: 0 };
      io.to(classCode).emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, liveSessions[classCode]);
    });

    // Observe-only mode for teachers - joins room without being on leaderboard
    socket.on(SOCKET_EVENTS.OBSERVE_CHALLENGE, async ({ classCode, token }: ObserveChallengePayload) => {
      if (!isValidClassCode(classCode) || !isValidToken(token)) return;

      // Pre-auth IP limiter
      if (!preAuthIpLimiter.checkLimit(clientIp)) return;

      const verifiedUid = await verifyToken(token);
      if (!verifiedUid) return;

      // Per-user rate limiter for observe
      if (!observeLimiter.checkLimit(verifiedUid)) return;

      const userData = await getUserRoleAndClass(verifiedUid);
      if (!userData || userData.role !== "teacher") return;

      const isOwner = await isTeacherForClass(verifiedUid, classCode);
      if (!isOwner) return;

      socket.join(classCode);
      // Send current leaderboard state to the authorized observer
      if (liveSessions[classCode]) {
        socket.emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, liveSessions[classCode]);
      }
    });

    socket.on(SOCKET_EVENTS.UPDATE_SCORE, ({ classCode, uid, score }) => {
      const MAX_LIVE_SCORE = 10000;
      if (!isValidClassCode(classCode) || !isValidUid(uid) || typeof score !== "number" || !isFinite(score) || score < 0 || score > MAX_LIVE_SCORE) return;

      // Only allow the socket that joined with this uid to update its own score
      const session = socketSessions[socket.id];
      if (!session || session.classCode !== classCode || session.uid !== uid) return;

      // Rate limit: max 2 score updates per second per socket
      if (!scoreUpdateLimiter.checkLimit(socket.id)) return;

      if (liveSessions[classCode] && liveSessions[classCode][uid]) {
        const entry = liveSessions[classCode][uid];
        // Validate: score can only increase, and by at most 10 points per update (one correct answer)
        const MAX_SCORE_INCREMENT = 10;
        if (score < entry.currentGameScore || score > entry.currentGameScore + MAX_SCORE_INCREMENT) return;
        // Update the current game score (baseScore remains unchanged)
        entry.currentGameScore = score;
        // Throttle: batch rapid score updates to avoid flooding sockets
        scheduleBroadcast(classCode);
      }
    });

    socket.on("disconnect", () => {
      const session = socketSessions[socket.id];
      if (session) {
        const { classCode, uid } = session;
        const refKey = `${classCode}:${uid}`;
        const remaining = (socketRefCounts[refKey] || 1) - 1;
        if (remaining <= 0) {
          // Last tab closed — remove from leaderboard
          delete socketRefCounts[refKey];
          if (liveSessions[classCode]) {
            delete liveSessions[classCode][uid];
            if (Object.keys(liveSessions[classCode]).length === 0) {
              delete liveSessions[classCode];
            } else {
              io.to(classCode).emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, liveSessions[classCode]);
            }
          }
        } else {
          socketRefCounts[refKey] = remaining;
        }
        delete socketSessions[socket.id];
      }
    });
  });

  // Health check endpoint for monitoring — minimal info to avoid leaking server state
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
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

    // Serve security.txt for vulnerability disclosure
    app.get("/.well-known/security.txt", (_req, res) => {
      res.type("text/plain").sendFile(path.join(distPath, ".well-known", "security.txt"));
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
