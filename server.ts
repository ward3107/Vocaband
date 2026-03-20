import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import { LeaderboardEntry, SOCKET_EVENTS, type JoinChallengePayload, type ObserveChallengePayload, type UpdateScorePayload } from "./src/types.js";

// Supabase admin client — uses the service role key to verify tokens server-side
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Validation constants
const VALIDATION = {
  CLASS_CODE_MIN: 1,
  CLASS_CODE_MAX: 64,
  NAME_MIN: 1,
  NAME_MAX: 100,
  UID_MIN: 1,
  UID_MAX: 128,
} as const;

// Reusable validation functions
function isValidClassCode(code: unknown): code is string {
  return typeof code === "string" && code.length >= VALIDATION.CLASS_CODE_MIN && code.length <= VALIDATION.CLASS_CODE_MAX;
}

function isValidName(value: unknown): value is string {
  return typeof value === "string" && value.length >= VALIDATION.NAME_MIN && value.length <= VALIDATION.NAME_MAX;
}

function isValidUid(value: unknown): value is string {
  return typeof value === "string" && value.length >= VALIDATION.UID_MIN && value.length <= VALIDATION.UID_MAX;
}

function isValidToken(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

async function verifyToken(token: string): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user.id;
  } catch {
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

// Rate limiter utility for socket connections with automatic cleanup
function createSocketRateLimiter(windowMs: number, maxAttempts: number, cleanupIntervalMs: number) {
  const records: Record<string, { count: number; resetAt: number }> = {};

  // Lazy cleanup function - removes expired entries
  const cleanup = () => {
    const now = Date.now();
    let cleaned = 0;
    for (const [ip, record] of Object.entries(records)) {
      if (now >= record.resetAt) {
        delete records[ip];
        cleaned++;
      }
    }
    return cleaned;
  };

  // Periodic cleanup to prevent unbounded memory growth
  const intervalId = setInterval(cleanup, cleanupIntervalMs);

  // Check if IP can proceed (returns true if allowed, false if rate limited)
  const checkLimit = (ip: string): boolean => {
    const now = Date.now();
    const record = records[ip];

    if (record && now < record.resetAt) {
      // Within window - check count
      if (record.count >= maxAttempts) {
        return false; // Rate limited
      }
      record.count++;
      return true;
    }

    // New window or expired - create new record
    records[ip] = { count: 1, resetAt: now + windowMs };
    return true;
  };

  // Shutdown cleanup
  const shutdown = () => {
    clearInterval(intervalId);
    // Clear all records
    for (const ip of Object.keys(records)) {
      delete records[ip];
    }
  };

  return { checkLimit, cleanup, shutdown, records };
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

    // Rate limit: max 60 requests per minute per IP
    app.use(rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests, please try again later." },
    }));
  }

  // Rate limit socket connections: track join-challenge attempts per IP
  // Using improved rate limiter with automatic cleanup
  const rateLimiter = createSocketRateLimiter(
    60 * 1000, // 1 minute window
    10,        // max 10 join attempts per minute per IP
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

  io.on("connection", (socket) => {
    const fwdHeader = socket.handshake.headers["x-forwarded-for"];
    const clientIp = (typeof fwdHeader === "string" ? fwdHeader.split(",")[0].trim() : socket.handshake.address) || "unknown";
    console.log("User connected:", socket.id);

    socket.on(SOCKET_EVENTS.JOIN_CHALLENGE, async ({ classCode, name, uid, token }: JoinChallengePayload) => {
      if (!isValidClassCode(classCode) || !isValidName(name) || !isValidUid(uid) || !isValidToken(token)) return;

      // Rate limit join-challenge by client IP
      if (!rateLimiter.checkLimit(clientIp)) return;

      // Verify Supabase JWT and confirm uid matches
      const verifiedUid = await verifyToken(token);
      if (!verifiedUid || verifiedUid !== uid) return;

      const userData = await getUserRoleAndClass(uid);
      if (!userData) return;

      // Only class members (students) or teachers who own the class can join.
      const canJoinAsStudent = userData.role === "student" && userData.classCode === classCode;
      const canJoinAsTeacher = userData.role === "teacher" && await isTeacherForClass(uid, classCode);
      if (!canJoinAsStudent && !canJoinAsTeacher) return;

      // Fetch student's TOTAL score using database aggregation
      // Uses a single aggregated query instead of fetching all records
      let totalScore = 0;
      try {
        const { data, error } = await supabaseAdmin
          .from("progress")
          .select("score")
          .eq("student_uid", uid)
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
      if (!liveSessions[classCode]) {
        liveSessions[classCode] = {};
      }
      liveSessions[classCode][uid] = { name, baseScore: totalScore, currentGameScore: 0 };
      io.to(classCode).emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, liveSessions[classCode]);
    });

    // Observe-only mode for teachers - joins room without being on leaderboard
    socket.on(SOCKET_EVENTS.OBSERVE_CHALLENGE, async ({ classCode, token }: ObserveChallengePayload) => {
      if (!isValidClassCode(classCode) || !isValidToken(token)) return;

      const verifiedUid = await verifyToken(token);
      if (!verifiedUid) return;

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

      if (liveSessions[classCode] && liveSessions[classCode][uid]) {
        // Update the current game score (baseScore remains unchanged)
        liveSessions[classCode][uid].currentGameScore = score;
        // Throttle: batch rapid score updates to avoid flooding sockets
        scheduleBroadcast(classCode);
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
            io.to(classCode).emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, liveSessions[classCode]);
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
