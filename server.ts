import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createHash } from "crypto";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildSystemPrompt, buildUserMessage, BAGRUT_TOOL } from "./src/features/vocabagrut/lib/bagrutPrompt";
import { validateBagrutTest, computeMcMax, scoreMcAnswers, stripAnswerKey } from "./src/features/vocabagrut/lib/bagrutSchema";
import { MODULE_SPECS } from "./src/features/vocabagrut/lib/moduleMap";
import type { BagrutModule, BagrutTest } from "./src/features/vocabagrut/types";
import { synthesizeSpeechMp3 } from "./tts-common";
import { LeaderboardEntry, SOCKET_EVENTS, type JoinChallengePayload, type ObserveChallengePayload, type UpdateScorePayload } from "./src/core/types";
import { isValidClassCode, isValidName, isValidUid, isValidToken, createSocketRateLimiter } from "./src/server-utils";
import {
  QUICK_PLAY_NS,
  QP_EVENTS,
  QP_SERVER_EVENTS,
  QP_MAX_STUDENTS_PER_SESSION,
  QP_MAX_NICKNAME,
  QP_MAX_SCORE_DELTA,
  QP_MAX_SESSION_SCORE,
  QP_BROADCAST_INTERVAL_MS,
  QP_IDLE_SWEEP_MS,
  isValidSessionCode,
  isValidClientId,
  isValidNickname,
  type QpStudentJoinPayload,
  type QpScoreUpdatePayload,
  type QpStudentLeavePayload,
  type QpTeacherObservePayload,
  type QpTeacherKickPayload,
  type QpTeacherEndPayload,
  type QpStudentEntry,
  type QpErrorCode,
} from "./src/core/quickPlayProtocol";
import { containsProfanity } from "./src/utils/nicknameProfanity";

// Check if Supabase is configured — server features (auth, socket, API endpoints)
// require these, but the frontend can still be served without them.
const hasSupabaseConfig = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!hasSupabaseConfig) {
  console.warn(
    "WARNING: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set.\n" +
    "The server will start but auth, socket, and API endpoints will be disabled.\n" +
    "Copy .env.example to .env and add your Supabase credentials."
  );
}

// Defensive startup check — surface the exact case that bit us once
// already: a copy-paste of the service-role key included a non-ASCII
// character (rightwards arrow, U+2192), which made every Supabase call
// throw "Cannot convert argument to a ByteString".  The error happens
// far from the secret-set step, so flag it loudly here at boot.
function flagNonAscii(name: string, value: string | undefined) {
  if (!value) return;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code > 127) {
      console.error(
        `[startup] WARNING: env var ${name} contains non-ASCII char U+${code.toString(16).padStart(4, '0').toUpperCase()} at index ${i}.  ` +
        `HTTP headers cannot carry this — re-set the secret with a clean copy-paste from the Supabase dashboard.`
      );
      return;
    }
  }
}
flagNonAscii('SUPABASE_URL', process.env.SUPABASE_URL);
flagNonAscii('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
flagNonAscii('GOOGLE_AI_API_KEY', process.env.GOOGLE_AI_API_KEY);
flagNonAscii('ANTHROPIC_API_KEY', process.env.ANTHROPIC_API_KEY);

// Supabase admin client — uses the service role key to verify tokens server-side
// Only created if credentials are available.
const supabaseAdmin = hasSupabaseConfig
  ? createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  : null;

async function verifyToken(token: string): Promise<string | null> {
  if (!supabaseAdmin) {
    console.error("[verifyToken] supabaseAdmin is null — SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
    return null;
  }
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error) {
      // Log the FULL error so we can see if it's a network issue, a bad
      // SUPABASE_URL, or a genuinely expired/invalid JWT.  Token-prefix
      // helps tell which user/session is failing without leaking the
      // whole JWT.
      console.warn(
        "[verifyToken] failed:",
        error.message,
        "status:", (error as { status?: number }).status,
        "tokenPrefix:", token.slice(0, 16),
        "supabaseUrl:", process.env.SUPABASE_URL,
      );
      return null;
    }
    if (!user) {
      console.warn("[verifyToken] no user returned for tokenPrefix:", token.slice(0, 16));
      return null;
    }
    return user.id;
  } catch (err) {
    console.error("[verifyToken] exception:", err);
    return null;
  }
}

async function verifyTokenWithEmail(token: string): Promise<{ uid: string; email: string } | null> {
  if (!supabaseAdmin) return null;
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user?.id || !user?.email) return null;
    return { uid: user.id, email: user.email };
  } catch {
    return null;
  }
}

// Shared gate for premium features (AI sentence generation, OCR, etc.).
// Returns { allowed: true } only if the email is in the ai_allowlist table.
// Case-insensitive: uses ilike so admins can INSERT 'Teacher@Gmail.com'
// and the teacher still matches when their auth email is 'teacher@gmail.com'.
// On table-missing errors (code 42P01), returns a helpful message so the
// admin can see they need to run the 20260417_ai_sentence_builder.sql migration.
async function isPremiumTeacher(email: string): Promise<{ allowed: boolean; error?: string }> {
  if (!supabaseAdmin) return { allowed: false, error: "Supabase not configured" };
  try {
    const { data, error } = await supabaseAdmin
      .from("ai_allowlist")
      .select("email")
      .ilike("email", email)
      .maybeSingle();
    if (error) {
      if ((error as { code?: string }).code === "42P01") {
        return { allowed: false, error: "ai_allowlist table missing — run supabase/migrations/20260417_ai_sentence_builder.sql in Supabase SQL Editor" };
      }
      return { allowed: false, error: error.message };
    }
    return { allowed: !!data };
  } catch (err) {
    return { allowed: false, error: String(err) };
  }
}

type UserRole = "teacher" | "student" | "admin";

async function getUserRoleAndClass(uid: string): Promise<{ role: UserRole; classCode: string | null } | null> {
  if (!supabaseAdmin) {
    console.warn("[getUserRoleAndClass] supabaseAdmin null — secrets missing");
    return null;
  }
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("role, class_code")
      .eq("uid", uid)
      .maybeSingle();
    if (error) {
      console.warn(
        "[getUserRoleAndClass] query error",
        "uid:", uid,
        "code:", error.code,
        "message:", error.message,
        "details:", error.details,
        "hint:", error.hint,
      );
      return null;
    }
    if (!data) {
      console.warn(
        "[getUserRoleAndClass] no row for uid",
        uid,
        "— check that public.users.uid matches auth.users.id::text in this project",
      );
      return null;
    }
    return {
      role: data.role as UserRole,
      classCode: data.class_code ?? null,
    };
  } catch (err) {
    console.error("[getUserRoleAndClass] exception:", err);
    return null;
  }
}

async function isTeacherForClass(uid: string, classCode: string): Promise<boolean> {
  if (!supabaseAdmin) return false;
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
  const allowedOrigins = allowedOrigin.split(",").map(o => o.trim());

  // Match Cloudflare preview URLs (per-branch + per-version) without having
  // to list every branch name in ALLOWED_ORIGIN. Every preview URL lands on
  // https://<hash-or-branch>-vocaband.wasya92.workers.dev — this regex covers
  // all of them. Keeps the explicit prod origin list intact for everything else.
  const PREVIEW_ORIGIN_RE = /^https:\/\/[a-z0-9-]+-vocaband\.wasya92\.workers\.dev$/i;
  const isOriginAllowed = (origin: string | undefined): boolean => {
    if (!origin) return false;
    if (allowedOrigins.includes(origin)) return true;
    if (PREVIEW_ORIGIN_RE.test(origin)) return true;
    return false;
  };

  const io = new Server(httpServer, {
    cors: {
      // Use a function so socket.io accepts both the static prod list AND
      // the dynamic preview-URL pattern. Same source of truth as the
      // Express CORS middleware below.
      origin: (origin, callback) => {
        if (!origin || isOriginAllowed(origin)) callback(null, true);
        else callback(new Error(`CORS: origin ${origin} not allowed`));
      },
    },
    // Performance tuning for 1500 concurrent users (classroom scenario)
    transports: ["websocket", "polling"], // prefer WebSocket, fallback to polling
    pingInterval: 30000,   // check connection every 30s (halves heartbeat traffic at scale)
    pingTimeout: 10000,    // allow 10s for pong response (mobile networks)
    maxHttpBufferSize: 64 * 1024, // 64KB max message size (leaderboard data)
  });

  const PORT = process.env.PORT || 3000;

  // Security middleware — applied in production only (Vite dev server handles its own headers)
  if (process.env.NODE_ENV === "production") {
    // Trust proxy so req.ip reflects the real client IP behind Cloudflare/Render
    app.set("trust proxy", 1);

    // Security headers via helmet.
    //
    // CSP policy notes:
    //   * scriptSrc keeps 'unsafe-inline' because Cloudflare Insights
    //     injects an inline beacon tag.  Dropping this needs a nonce-
    //     based refactor of index.html — a separate workstream.
    //   * 'unsafe-eval' was removed in 2026-04-28's Phase 3 sec audit.
    //     Vite production output + React 19 + motion/react don't use
    //     eval() / new Function() in production.  Keeping the door
    //     closed prevents one of the most common XSS escalation paths.
    //   * styleSrc keeps 'unsafe-inline' because motion/react animates
    //     by writing inline `style="..."` attributes on every animated
    //     element.  Removing it would break every transition, every
    //     hover scale, every gradient pulse.  Load-bearing.
    //   * upgrade-insecure-requests added in 2026-04-28: any straggling
    //     http://supabase.co references in third-party libs get
    //     rewritten to https:// transparently.
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com", "https://ajax.cloudflare.com", "https://challenges.cloudflare.com"],
          scriptSrcElem: ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com", "https://ajax.cloudflare.com", "https://challenges.cloudflare.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://auth.vocaband.com", "wss://auth.vocaband.com", "https://*.supabase.co", "wss://*.supabase.co", "https://cloudflareinsights.com", "https://api.mymemory.translated.net", ...allowedOrigins],
          frameSrc: ["https://accounts.google.com", "https://challenges.cloudflare.com"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'", "https://accounts.google.com"],
          workerSrc: ["'self'", "blob:"],
          mediaSrc: ["'self'", "https://*.supabase.co"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      // same-origin-allow-popups so the Google OAuth popup can postMessage
      // back to the opener — strict same-origin breaks the sign-in handshake.
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      // same-site so Supabase audio/storage CDN responses still load (those
      // resources are served from *.supabase.co which is cross-site) — wait,
      // they're cross-site, so we actually need cross-origin here. Keep the
      // default (same-origin) at the response level and rely on Resource-
      // Server CORP headers for cross-site media. Disable helmet's default to
      // avoid breaking cross-origin <img>/<audio>/<video> loads.
      crossOriginResourcePolicy: false,
      crossOriginEmbedderPolicy: false,
      // Belt-and-suspenders Permissions-Policy: deny everything we never use.
      // Helmet's default is empty, so we set this via a separate middleware.
    }));

    // Permissions-Policy + X-Permitted-Cross-Domain-Policies (helmet doesn't
    // emit these out of the box). Mirrors public/_headers.
    app.use((_req, res, next) => {
      res.setHeader(
        "Permissions-Policy",
        "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()"
      );
      res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
      next();
    });

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

  // CORS for /api/* routes (needed when SPA is served from Cloudflare Pages
  // or a preview URL on workers.dev). Uses the shared isOriginAllowed helper
  // so static prod origins + dynamic preview-URL pattern both work.
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (isOriginAllowed(origin)) {
      res.header('Access-Control-Allow-Origin', origin!);
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.header('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // Parse JSON request bodies (required for /api/translate endpoint)
  app.use(express.json({ limit: '50kb' }));

  // Multer for OCR image uploads (in-memory, no temp files)
  // 15 MB limit: mobile photos are typically 3-8 MB, and the client compresses
  // before upload, but we keep a generous server limit as a safety net.
  const ocrUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp", "image/heic", "image/heif"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported image type: ${file.mimetype}. Use JPEG, PNG, or WebP.`));
      }
    },
  });

  // OCR-specific rate limiter (per-teacher, not per-IP)
  const ocrRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many OCR requests. Please wait a minute before trying again." },
    keyGenerator: (req) => req.headers.authorization?.substring(7) || ipKeyGenerator(req.ip || "unknown") || "unknown",
  });

  // Translate endpoint rate limiter — per-teacher (Bearer token).  A normal
  // teacher will hit /api/translate a handful of times per assignment; a
  // spammer churning through Gemini quota will hit hundreds.  We also log
  // the offender so abuse patterns show up in Render logs for follow-up.
  const translateRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many translation requests. Please wait a minute before trying again." },
    keyGenerator: (req) => req.headers.authorization?.substring(7) || ipKeyGenerator(req.ip || "unknown") || "unknown",
    handler: (req, res, _next, options) => {
      const ip = req.ip || "unknown";
      const keyPreview = (req.headers.authorization?.substring(7, 17) || "no-auth") + "…";
      console.warn(`[abuse] /api/translate rate-limited: ip=${ip} token=${keyPreview}`);
      res.status(options.statusCode).json(options.message);
    },
  });

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
  // Verbose socket logging only in dev — at 1500 concurrent users, logging
  // every connection attempt is both noisy and a mild PII concern (raw IPs).
  const isDev = process.env.NODE_ENV !== "production";

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (isDev) console.log("[Socket] Connection attempt from", socket.handshake.address, "with token:", token ? "✓" : "✗");

    if (typeof token !== "string" || token.length === 0) {
      if (isDev) console.warn("[Socket] Rejected: No token provided");
      return next(new Error("Authentication required"));
    }
    const uid = await verifyToken(token);
    if (!uid) {
      if (isDev) console.warn("[Socket] Rejected: Invalid token");
      return next(new Error("Invalid token"));
    }

    if (isDev) console.log("[Socket] Authenticated successfully for uid:", uid);
    // Attach verified uid to socket data for use in event handlers
    (socket.data as { uid: string }).uid = uid;
    next();
  });

  io.on("connection", (socket) => {
    const uid = (socket.data as { uid: string }).uid;
    const clientIp = getSocketIp(socket);
    if (isDev) console.log(`[Socket] Client connected: uid=${uid}, ip=${clientIp}, socket=${socket.id}`);

    // Helper: emit the reason a challenge event was rejected back to
    // the specific socket that sent it.  Previously every reject path
    // was a silent `return`, which made "student doesn't appear on the
    // podium" impossible to debug — the client had no signal the event
    // was even rejected.  Now the client can log the reason (and could
    // optionally toast it) so operators can see the root cause in the
    // student's DevTools without server log access.
    const rejectChallenge = (event: string, reason: string) => {
      if (isDev) console.warn(`[Socket] Rejected ${event}: ${reason}`, { uid: socket.data.uid });
      socket.emit("challenge_error", { event, reason });
    };

    socket.on(SOCKET_EVENTS.JOIN_CHALLENGE, async ({ classCode, name, uid }: JoinChallengePayload) => {
      if (!isValidClassCode(classCode) || !isValidName(name) || !isValidUid(uid)) {
        return rejectChallenge("join_challenge", "invalid payload");
      }

      if (!preAuthIpLimiter.checkLimit(clientIp)) {
        return rejectChallenge("join_challenge", "rate limited (ip)");
      }

      if (uid !== socket.data.uid) {
        return rejectChallenge("join_challenge", "uid mismatch — payload uid doesn't match JWT uid (ensure app emits session.user.id, not profile.auth_uid)");
      }

      if (!perUserLimiter.checkLimit(uid)) {
        return rejectChallenge("join_challenge", "rate limited (per-user)");
      }

      const userData = await getUserRoleAndClass(uid);
      if (!userData) {
        return rejectChallenge("join_challenge", "no users-table row for this uid");
      }

      const canJoinAsStudent = userData.role === "student" && userData.classCode === classCode;
      const canJoinAsTeacher = userData.role === "teacher" && await isTeacherForClass(uid, classCode);
      if (!canJoinAsStudent && !canJoinAsTeacher) {
        return rejectChallenge("join_challenge", `role/class mismatch — role=${userData.role} userClassCode=${userData.classCode} requestedClassCode=${classCode}`);
      }

      // Fetch student's total score for THIS class via SQL SUM (single row result,
      // much faster than fetching 1000 rows and summing in JS — critical for 200+ users)
      let totalScore = 0;
      try {
        if (!supabaseAdmin) throw new Error("Supabase not configured");
        const { data, error } = await supabaseAdmin
          .from("progress")
          .select("score.sum()")
          .eq("student_uid", uid)
          .eq("class_code", classCode)
          .single();
        if (!error && data) {
          totalScore = (data as { sum: number | null }).sum ?? 0;
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
    socket.on(SOCKET_EVENTS.OBSERVE_CHALLENGE, async ({ classCode }: ObserveChallengePayload) => {
      if (!isValidClassCode(classCode)) {
        return rejectChallenge("observe_challenge", "invalid classCode");
      }

      if (!preAuthIpLimiter.checkLimit(clientIp)) {
        return rejectChallenge("observe_challenge", "rate limited (ip)");
      }

      const verifiedUid = socket.data.uid as string;

      if (!observeLimiter.checkLimit(verifiedUid)) {
        return rejectChallenge("observe_challenge", "rate limited (per-user)");
      }

      const userData = await getUserRoleAndClass(verifiedUid);
      if (!userData || userData.role !== "teacher") {
        return rejectChallenge("observe_challenge", `not a teacher (role=${userData?.role ?? 'none'})`);
      }

      const isOwner = await isTeacherForClass(verifiedUid, classCode);
      if (!isOwner) {
        return rejectChallenge("observe_challenge", "teacher doesn't own this class");
      }

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

  // ──────────────────────────────────────────────────────────────────────
  // QUICK PLAY v2 — unauthenticated namespace
  //
  // Kept fully separate from the authenticated `/` namespace above.
  // Students connect with no JWT, just a client-generated UUID + the
  // session code the teacher's QR poster shows. Teachers connect with
  // their Supabase access token and have it verified per-action before
  // any kick/end takes effect.
  //
  // State is in-memory here; survives as long as the Node process
  // does. The `quick_play_sessions` row in Postgres remains the source
  // of truth for "does this session exist at all + what words/modes"
  // — the in-memory map only tracks live leaderboard.
  // ──────────────────────────────────────────────────────────────────────

  interface QpSessionState {
    sessionCode: string;
    students: Map<string, QpStudentEntry>;           // clientId → entry
    socketToClient: Map<string, string>;              // socket.id → clientId
    teacherSockets: Set<string>;                      // socket.id of observers
    lastTeacherSeenAt: number;                        // epoch ms
    // clientIds the teacher has KICKED in this session.  STUDENT_JOIN
    // checks against this set and refuses to re-add a kicked student
    // even if their socket auto-reconnects (which socket.io does by
    // default).  Without this, the kick "didn't stick" — server
    // disconnected the kicked student's socket, the client
    // reconnected, replayed STUDENT_JOIN with the same clientId, and
    // the leaderboard reincarnated them.  Lives only as long as the
    // in-memory session does (cleared on TEACHER_END / idle sweep).
    kickedClientIds: Set<string>;
  }

  const qpSessions = new Map<string, QpSessionState>();
  // Throttled broadcast scheduler: one entry per session with pending change.
  const qpPendingBroadcasts = new Set<string>();
  let qpBroadcastTimer: ReturnType<typeof setTimeout> | null = null;

  // Rate limiters — sized for a real classroom on a school's NAT'd
  // Wi-Fi where ALL students hit the server from one external IP.
  //
  // Old qpJoinLimiter sat at 120 handshakes/min/IP, which the
  // 2026-04-25 audit caught as the silent reason "30 students
  // joined but only some show up on the dashboard": the school
  // shares one IP across multiple classrooms, students refresh /
  // reconnect on flaky Wi-Fi, and the bucket fills inside a minute.
  // Subsequent socket handshakes get rejected with `rate_limited` —
  // the student's tab silently never connects, and the teacher's
  // leaderboard stays at the count from before the cap.
  //
  // 600/min/IP comfortably handles two ~40-student classes joining
  // at the bell + a stream of reconnects, while still blocking an
  // actual handshake-flood attack (which would have to sustain
  // ~10/sec to hit even the new ceiling).
  const qpJoinLimiter       = createSocketRateLimiter(60_000, 600, 5 * 60_000); // 600 handshakes/min/IP
  const qpScoreLimiter      = createSocketRateLimiter(5_000,   30, 5 * 60_000); //  30 updates/5s/socket
  const qpTeacherLimiter    = createSocketRateLimiter(60_000,  60, 5 * 60_000); //  60 teacher actions/min

  const qpIo = io.of(QUICK_PLAY_NS);

  // Namespace-level auth middleware — unlike `/`, this one is permissive:
  // it only rate-limits the handshake so one box can't flood the server
  // with connection churn.
  qpIo.use((socket, next) => {
    const clientIp = getSocketIp(socket);
    if (!qpJoinLimiter.checkLimit(clientIp)) {
      return next(new Error("rate_limited"));
    }
    next();
  });

  // ─── Broadcast helpers ──────────────────────────────────────────────

  function qpScheduleBroadcast(sessionCode: string) {
    qpPendingBroadcasts.add(sessionCode);
    if (qpBroadcastTimer) return;
    qpBroadcastTimer = setTimeout(() => {
      for (const code of qpPendingBroadcasts) {
        const s = qpSessions.get(code);
        if (s) {
          qpIo.to(code).emit(QP_SERVER_EVENTS.LEADERBOARD, {
            sessionCode: code,
            students: Array.from(s.students.values()),
          });
        }
      }
      qpPendingBroadcasts.clear();
      qpBroadcastTimer = null;
    }, QP_BROADCAST_INTERVAL_MS);
  }

  function qpEmitError(
    socket: import("socket.io").Socket,
    event: string,
    code: QpErrorCode,
    message: string,
  ) {
    if (isDev) console.warn(`[QuickPlay] ${event} rejected: ${code} — ${message}`);
    socket.emit(QP_SERVER_EVENTS.ERROR, { event, code, message });
  }

  async function qpVerifyTeacherOwnsSession(
    token: string,
    sessionCode: string,
  ): Promise<{ ok: true; uid: string } | { ok: false; reason: QpErrorCode }> {
    if (!isValidToken(token)) return { ok: false, reason: "unauthorized" };
    const uid = await verifyToken(token);
    if (!uid) return { ok: false, reason: "unauthorized" };
    if (!supabaseAdmin) return { ok: false, reason: "internal_error" };
    const { data, error } = await supabaseAdmin
      .from("quick_play_sessions")
      .select("teacher_uid, is_active")
      .eq("session_code", sessionCode)
      .maybeSingle();
    if (error || !data) return { ok: false, reason: "session_not_found" };
    if (data.teacher_uid !== uid) return { ok: false, reason: "unauthorized" };
    return { ok: true, uid };
  }

  async function qpSessionIsActive(sessionCode: string): Promise<boolean> {
    if (!supabaseAdmin) return false;
    const { data, error } = await supabaseAdmin
      .from("quick_play_sessions")
      .select("is_active")
      .eq("session_code", sessionCode)
      .maybeSingle();
    return !error && !!data && data.is_active === true;
  }

  function qpGetOrCreateSession(sessionCode: string): QpSessionState {
    let s = qpSessions.get(sessionCode);
    if (!s) {
      s = {
        sessionCode,
        students: new Map(),
        socketToClient: new Map(),
        teacherSockets: new Set(),
        lastTeacherSeenAt: Date.now(),
        kickedClientIds: new Set(),
      };
      qpSessions.set(sessionCode, s);
    }
    return s;
  }

  // ─── Connection handler ─────────────────────────────────────────────

  qpIo.on("connection", (socket) => {
    if (isDev) console.log(`[QuickPlay] connected socket=${socket.id} ip=${getSocketIp(socket)}`);

    // Student join — validates payload and session existence, then
    // inserts into the in-memory leaderboard and broadcasts.
    socket.on(QP_EVENTS.STUDENT_JOIN, async (payload: QpStudentJoinPayload) => {
      if (!payload || typeof payload !== "object") {
        return qpEmitError(socket, QP_EVENTS.STUDENT_JOIN, "invalid_payload", "missing payload");
      }
      const sessionCode = payload.sessionCode;
      const clientId = payload.clientId;
      const nickname = typeof payload.nickname === "string" ? payload.nickname.trim().slice(0, QP_MAX_NICKNAME) : "";
      const avatar = typeof payload.avatar === "string" && payload.avatar.length > 0 && payload.avatar.length <= 8
        ? payload.avatar : "🦊";

      if (!isValidSessionCode(sessionCode)) return qpEmitError(socket, QP_EVENTS.STUDENT_JOIN, "invalid_payload", "bad session code");
      if (!isValidClientId(clientId))      return qpEmitError(socket, QP_EVENTS.STUDENT_JOIN, "invalid_payload", "bad clientId");
      if (!isValidNickname(nickname))      return qpEmitError(socket, QP_EVENTS.STUDENT_JOIN, "invalid_payload", "bad nickname");
      // Defense-in-depth profanity gate — the client also blocks but
      // a determined student could bypass via direct socket payload.
      // Filter covers EN/HE/AR best-effort.
      if (containsProfanity(nickname))     return qpEmitError(socket, QP_EVENTS.STUDENT_JOIN, "invalid_payload", "Please pick a different name.");

      // Session must exist and be active in the DB. Cheap single-row read.
      if (!(await qpSessionIsActive(sessionCode))) {
        return qpEmitError(socket, QP_EVENTS.STUDENT_JOIN, "session_inactive", "session is not active");
      }

      const state = qpGetOrCreateSession(sessionCode);

      // Reject kicked clientIds — sticky for the lifetime of the in-
      // memory session.  Without this guard, force-disconnecting the
      // kicked socket only sticks until socket.io's auto-reconnect
      // fires and the client replays STUDENT_JOIN with the same
      // clientId.  Also re-emit KICKED so the client tab flips back
      // to the kicked screen if it was somehow reset.
      if (state.kickedClientIds.has(clientId)) {
        socket.emit(QP_SERVER_EVENTS.KICKED, { sessionCode });
        return qpEmitError(socket, QP_EVENTS.STUDENT_JOIN, "kicked", "you were removed from this session");
      }

      // Nickname adoption — same-nickname re-join.
      //
      // Before this change: a student who lost connection (back button,
      // tab close, network blip) and re-scanned the QR with the SAME
      // nickname was rejected with "nickname_taken" because they
      // arrived with a fresh clientId (sessionStorage doesn't survive
      // a closed tab) and the old slot was still in state.students.
      //
      // After: same-nickname re-joiners ADOPT the existing slot.
      // Their score / avatar / authUid carry over.  The old socket
      // (if still connected) is force-disconnected so two devices
      // can't play as the same nickname simultaneously.
      //
      // Kick still wins.  If the old clientId was kicked, the new
      // clientId inherits the kick — kicks are per-PLAYER, not
      // per-DEVICE, so a teacher's removal sticks across reconnects.
      // The teacher must explicitly un-kick (end session + restart)
      // to let the player back in.
      let adoptedFrom: string | null = null;
      for (const [oldClientId, entry] of state.students.entries()) {
        if (oldClientId !== clientId && entry.nickname.toLowerCase() === nickname.toLowerCase()) {
          if (state.kickedClientIds.has(oldClientId)) {
            // Old slot was kicked — the new clientId is just a fresh
            // device for the same kicked player.  Mark them too so
            // re-scanning won't bypass the kick.
            state.kickedClientIds.add(clientId);
            socket.emit(QP_SERVER_EVENTS.KICKED, { sessionCode });
            return qpEmitError(socket, QP_EVENTS.STUDENT_JOIN, "kicked", "you were removed from this session");
          }
          adoptedFrom = oldClientId;
          break;
        }
      }

      if (adoptedFrom) {
        const oldEntry = state.students.get(adoptedFrom)!;
        // Lift the old slot into the new clientId, preserving
        // gameplay state.  Avatar from the new payload wins (kid
        // may have re-picked it on the join screen) but score and
        // authUid carry forward.
        state.students.delete(adoptedFrom);
        state.students.set(clientId, {
          clientId,
          nickname: oldEntry.nickname,
          avatar: avatar || oldEntry.avatar,
          score: oldEntry.score,
          lastSeen: Date.now(),
          authUid: oldEntry.authUid,
        });
        // Boot the OLD socket if it's still hanging around so the
        // ghost device doesn't keep playing under the same name.
        for (const [sockId, cId] of Array.from(state.socketToClient.entries())) {
          if (cId === adoptedFrom) {
            const oldSock = qpIo.sockets.get(sockId);
            if (oldSock) oldSock.disconnect(true);
            state.socketToClient.delete(sockId);
          }
        }
        console.log(`[QP JOIN adopt] session=${sessionCode} nickname=${nickname} oldClient=${adoptedFrom.slice(0, 8)} newClient=${clientId.slice(0, 8)} score=${oldEntry.score}`);
      }

      if (!state.students.has(clientId) && state.students.size >= QP_MAX_STUDENTS_PER_SESSION) {
        return qpEmitError(socket, QP_EVENTS.STUDENT_JOIN, "session_full", "this session is full");
      }

      const now = Date.now();
      const prev = state.students.get(clientId);
      // Capture the optional authUid the client may have included so
      // TEACHER_END can persist a real progress row.  Held privately —
      // never echoed back to peers (LEADERBOARD payload type omits it).
      const incomingAuthUid = typeof payload.authUid === "string" && /^[0-9a-f-]{36}$/i.test(payload.authUid)
        ? payload.authUid
        : undefined;
      // Re-joining (refresh / reconnect) keeps score; truly new joiner starts at 0.
      state.students.set(clientId, {
        clientId,
        nickname,
        avatar,
        score: prev?.score ?? 0,
        lastSeen: now,
        authUid: incomingAuthUid ?? prev?.authUid,
      });
      state.socketToClient.set(socket.id, clientId);
      socket.join(sessionCode);

      socket.emit(QP_SERVER_EVENTS.JOINED, {
        clientId,
        leaderboard: Array.from(state.students.values()),
      });
      qpScheduleBroadcast(sessionCode);
    });

    // Score update — only accepted from the socket that owns the
    // clientId, score must be monotonically non-decreasing, and deltas
    // are bounded so a pasted value can't blow the leaderboard.
    socket.on(QP_EVENTS.SCORE_UPDATE, (payload: QpScoreUpdatePayload) => {
      if (!payload || typeof payload !== "object") return;
      const { sessionCode, clientId, score } = payload;
      if (!isValidSessionCode(sessionCode) || !isValidClientId(clientId)) {
        console.warn(`[QP SCORE bad payload] session=${sessionCode} client=${clientId} score=${score}`);
        return;
      }
      if (typeof score !== "number" || !isFinite(score) || score < 0 || score > QP_MAX_SESSION_SCORE) {
        console.warn(`[QP SCORE bad score] session=${sessionCode} score=${score}`);
        return;
      }

      if (!qpScoreLimiter.checkLimit(socket.id)) {
        console.warn(`[QP SCORE rate-limited] socket=${socket.id} session=${sessionCode}`);
        return;
      }
      const state = qpSessions.get(sessionCode);
      if (!state) {
        console.warn(`[QP SCORE no session] session=${sessionCode}`);
        return;
      }
      const owned = state.socketToClient.get(socket.id);
      if (owned !== clientId) {
        // Self-heal level 1 only: known clientId, just re-attach the
        // socket→client mapping (post-reconnect race).
        if (state.students.has(clientId)) {
          state.socketToClient.set(socket.id, clientId);
          socket.join(sessionCode);
          console.log(
            `[QP SCORE self-heal] reattached socket=${socket.id} ` +
            `to client=${clientId} session=${sessionCode}`,
          );
        } else {
          // Unknown clientId.  Previously we created a placeholder
          // row here, but that produced phantom students on the
          // teacher's podium ('?' avatar with the score, alongside
          // the real student showing 0 pts) when the client raced a
          // score emit ahead of the JOIN packet.  Better behaviour:
          // log + drop.  The actual fix is on the client (use a ref
          // for clientId so updateScore can never see a stale state
          // value).
          console.warn(
            `[QP SCORE owner-mismatch] socket=${socket.id} ` +
            `claimedClient=${clientId} socketOwnsClient=${owned ?? "<none>"} ` +
            `session=${sessionCode} score=${score} ` +
            `mapSize=${state.socketToClient.size} students=${state.students.size}`,
          );
          return;
        }
      }
      const entry = state.students.get(clientId);
      if (!entry) {
        console.warn(`[QP SCORE no entry] session=${sessionCode} client=${clientId}`);
        return;
      }
      if (score < entry.score) {
        console.warn(`[QP SCORE regress] session=${sessionCode} client=${clientId} prev=${entry.score} new=${score}`);
        return;
      }
      if (score > entry.score + QP_MAX_SCORE_DELTA) {
        console.warn(
          `[QP score rejected] session=${sessionCode} client=${clientId} ` +
          `previous=${entry.score} attempted=${score} delta=${score - entry.score} ` +
          `cap=${QP_MAX_SCORE_DELTA}`,
        );
        return;
      }

      const prevScore = entry.score;
      entry.score = score;
      entry.lastSeen = Date.now();
      console.log(`[QP SCORE accept] session=${sessionCode} client=${clientId} ${prevScore}→${score}`);
      qpScheduleBroadcast(sessionCode);
    });

    // Student explicit leave — same effect as disconnecting, but
    // propagates immediately rather than waiting for the ping timeout.
    socket.on(QP_EVENTS.STUDENT_LEAVE, (payload: QpStudentLeavePayload) => {
      if (!payload || typeof payload !== "object") return;
      const { sessionCode, clientId } = payload;
      if (!isValidSessionCode(sessionCode) || !isValidClientId(clientId)) return;
      const state = qpSessions.get(sessionCode);
      if (!state) return;
      const owned = state.socketToClient.get(socket.id);
      if (owned !== clientId) return;
      state.students.delete(clientId);
      state.socketToClient.delete(socket.id);
      socket.leave(sessionCode);
      qpScheduleBroadcast(sessionCode);
    });

    // Teacher observe — grants receipt of leaderboard broadcasts + kick
    // authority. Token is verified against the session's teacher_uid.
    socket.on(QP_EVENTS.TEACHER_OBSERVE, async (payload: QpTeacherObservePayload) => {
      if (!payload || typeof payload !== "object") return;
      const { sessionCode, token } = payload;
      if (!isValidSessionCode(sessionCode)) {
        return qpEmitError(socket, QP_EVENTS.TEACHER_OBSERVE, "invalid_payload", "bad session code");
      }
      if (!qpTeacherLimiter.checkLimit(socket.id)) {
        return qpEmitError(socket, QP_EVENTS.TEACHER_OBSERVE, "rate_limited", "too many teacher actions");
      }
      const verify = await qpVerifyTeacherOwnsSession(token, sessionCode);
      if (!verify.ok) return qpEmitError(socket, QP_EVENTS.TEACHER_OBSERVE, verify.reason, "access denied");

      const state = qpGetOrCreateSession(sessionCode);
      state.teacherSockets.add(socket.id);
      state.lastTeacherSeenAt = Date.now();
      socket.join(sessionCode);
      socket.emit(QP_SERVER_EVENTS.LEADERBOARD, {
        sessionCode,
        students: Array.from(state.students.values()),
      });
    });

    socket.on(QP_EVENTS.TEACHER_KICK, async (payload: QpTeacherKickPayload) => {
      if (!payload || typeof payload !== "object") return;
      const { sessionCode, clientId, token } = payload;
      if (!isValidSessionCode(sessionCode) || !isValidClientId(clientId)) {
        return qpEmitError(socket, QP_EVENTS.TEACHER_KICK, "invalid_payload", "bad payload");
      }
      if (!qpTeacherLimiter.checkLimit(socket.id)) {
        return qpEmitError(socket, QP_EVENTS.TEACHER_KICK, "rate_limited", "too many teacher actions");
      }
      const verify = await qpVerifyTeacherOwnsSession(token, sessionCode);
      if (!verify.ok) return qpEmitError(socket, QP_EVENTS.TEACHER_KICK, verify.reason, "access denied");

      const state = qpSessions.get(sessionCode);
      if (!state) return;
      // Mark as kicked BEFORE we drop the entry, so any race between
      // our own disconnect and the client's auto-reconnect lands on
      // the STUDENT_JOIN guard that rejects kicked clientIds.
      state.kickedClientIds.add(clientId);
      const removed = state.students.delete(clientId);
      if (!removed) {
        // Already gone (idle sweep, etc.) — but we still kicked, so
        // keep the kickedClientIds entry to block any future rejoin.
      }
      // Notify the kicked student's socket directly (find by reverse lookup).
      // `leave()` alone isn't enough — the student's socket is still
      // connected and can re-emit STUDENT_JOIN with the same clientId
      // and land right back on the leaderboard.  Force-disconnect so the
      // kick actually sticks, and rely on the client's KICKED listener
      // to flip the kicked screen before the socket tears down.
      for (const [sockId, cId] of state.socketToClient.entries()) {
        if (cId === clientId) {
          state.socketToClient.delete(sockId);
          const targetSocket = qpIo.sockets.get(sockId);
          targetSocket?.emit(QP_SERVER_EVENTS.KICKED, { sessionCode });
          targetSocket?.leave(sessionCode);
          // Give the KICKED packet a moment to flush before severing
          // the connection.  Without the delay, disconnect() races the
          // emit and the student never sees the kicked screen.
          if (targetSocket) {
            setTimeout(() => { try { targetSocket.disconnect(true); } catch { /* already gone */ } }, 200);
          }
        }
      }
      qpScheduleBroadcast(sessionCode);
    });

    socket.on(QP_EVENTS.TEACHER_END, async (payload: QpTeacherEndPayload) => {
      if (!payload || typeof payload !== "object") return;
      const { sessionCode, token } = payload;
      if (!isValidSessionCode(sessionCode)) {
        return qpEmitError(socket, QP_EVENTS.TEACHER_END, "invalid_payload", "bad session code");
      }
      if (!qpTeacherLimiter.checkLimit(socket.id)) {
        return qpEmitError(socket, QP_EVENTS.TEACHER_END, "rate_limited", "too many teacher actions");
      }
      const verify = await qpVerifyTeacherOwnsSession(token, sessionCode);
      if (!verify.ok) return qpEmitError(socket, QP_EVENTS.TEACHER_END, verify.reason, "access denied");

      // Persist the final leaderboard to public.progress BEFORE
      // tearing down the in-memory state.  Under V2 the leaderboard
      // lives only in server memory while the game runs; without
      // this write the teacher's gradebook + analytics show no rows
      // for the just-played session ("I ended it and nothing landed
      // in the database" was the literal report).  Skip students
      // whose client never sent an authUid (older client builds, or
      // truly unauthenticated browsers — a real auth.users row is
      // required by the progress trigger from migration 20260430).
      const endingSessionState = qpSessions.get(sessionCode);
      if (endingSessionState && supabaseAdmin) {
        // Resolve the session UUID once — it's the assignment_id for
        // every progress row.  If the lookup fails we still tear down,
        // we just skip persistence rather than block the teacher.
        try {
          const { data: sessRow } = await supabaseAdmin
            .from("quick_play_sessions")
            .select("id")
            .eq("session_code", sessionCode)
            .maybeSingle();
          const assignmentId = sessRow?.id as string | undefined;
          if (assignmentId) {
            // Persist EVERY student that scored, regardless of whether
            // their client managed to attach an authUid.  Anonymous
            // sign-ins are disabled in some Supabase orgs / blocked by
            // private browsing, so a strict `s.authUid` filter
            // silently dropped the entire leaderboard at session-end
            // (audit 2026-04-25 — teacher saw zero gradebook rows
            // even though scores climbed live).  The companion
            // migration 20260517 relaxes the progress trigger so a
            // synthetic `qp:<clientId>` student_uid is accepted on
            // QUICK_PLAY rows.
            const persistableStudents = Array.from(endingSessionState.students.values())
              .filter(s => s.score > 0);
            console.warn(`[QP TEACHER_END persist] ${sessionCode}: ${persistableStudents.length} students with score>0 (of ${endingSessionState.students.size} total)`);
            if (persistableStudents.length > 0) {
              await Promise.all(persistableStudents.map(async (s) => {
                // Real auth uid wins; otherwise fall back to a
                // namespaced clientId so the trigger sees a stable,
                // non-colliding identifier per student per session.
                const studentUid = s.authUid || `qp:${s.clientId}`;
                try {
                  const { error } = await supabaseAdmin!.rpc("save_student_progress", {
                    p_student_name: s.nickname,
                    p_student_uid: studentUid,
                    p_assignment_id: assignmentId,
                    p_class_code: "QUICK_PLAY",
                    p_score: Math.round(s.score),
                    p_mode: "quickplay",
                    p_mistakes: [] as number[],
                    p_avatar: s.avatar,
                    p_word_attempts: null,
                  });
                  if (error) {
                    console.warn("[QP TEACHER_END persist] failed for", s.clientId, error.message);
                  } else {
                    console.warn("[QP TEACHER_END persist] saved", s.nickname, s.score);
                  }
                } catch (err) {
                  console.warn("[QP TEACHER_END persist] threw for", s.clientId, err);
                }
              }));
            }
          } else {
            console.warn(`[QP TEACHER_END persist] ${sessionCode}: no assignment_id, skipping persist`);
          }
        } catch (err) {
          console.warn("[QP TEACHER_END persist] session lookup failed", err);
        }
      }

      qpIo.to(sessionCode).emit(QP_SERVER_EVENTS.SESSION_ENDED, { sessionCode });
      // Force every student socket in the room to disconnect after the
      // SESSION_ENDED packet flushes.  Without this, students can keep
      // emitting SCORE_UPDATE against the (now-deleted) session — the
      // server no-ops them, but the game UI on their end has no reason
      // to stop either, so they keep playing until the tab is closed.
      // The socket disconnect bubbles into the client's onDisconnect →
      // sessionEndedRef path so the UI transition is unambiguous.
      if (endingSessionState) {
        const sockIds = Array.from(endingSessionState.socketToClient.keys());
        setTimeout(() => {
          for (const sockId of sockIds) {
            const sock = qpIo.sockets.get(sockId);
            try { sock?.disconnect(true); } catch { /* already gone */ }
          }
        }, 250);
      }
      // Tear down in-memory state.  Teacher's `is_active=false` DB
      // update is their own responsibility (client already does this
      // via end_quick_play_session RPC).
      qpSessions.delete(sessionCode);
    });

    socket.on("disconnect", () => {
      // Find which session this socket belonged to.  Don't drop the
      // student's leaderboard entry on disconnect — a Wi-Fi blink, a
      // student locking the phone, or even the teacher refreshing
      // their tab can briefly drop sockets, and deleting + re-creating
      // the entry on reconnect resets their score to 0 (the JOIN
      // handler reads `prev?.score ?? 0`, but `prev` is gone).  The
      // teacher then sees "students playing but no scores" because
      // every reconnect is silently zeroing the leaderboard.
      //
      // Instead: just update lastSeen so the teacher UI greys out the
      // disconnected row, and let the idle sweep reap truly stale
      // entries after QP_IDLE_SWEEP_MS.
      for (const state of qpSessions.values()) {
        const clientId = state.socketToClient.get(socket.id);
        if (clientId) {
          state.socketToClient.delete(socket.id);
          const entry = state.students.get(clientId);
          if (entry) {
            entry.lastSeen = Date.now();
          }
          qpScheduleBroadcast(state.sessionCode);
        }
        // Teacher disconnect — don't drop the session; just refresh idle timer.
        if (state.teacherSockets.has(socket.id)) {
          state.teacherSockets.delete(socket.id);
          state.lastTeacherSeenAt = Date.now();
        }
      }
    });
  });

  // ─── Idle sweep ─────────────────────────────────────────────────────
  // Drop sessions whose teacher hasn't been connected for a long time.
  // Prevents orphan in-memory state when a teacher closes the laptop
  // without ending the session.
  const qpSweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [code, state] of qpSessions.entries()) {
      const noTeacher = state.teacherSockets.size === 0;
      const teacherGone = now - state.lastTeacherSeenAt > QP_IDLE_SWEEP_MS;
      if (noTeacher && teacherGone) {
        if (isDev) console.log(`[QuickPlay] sweeping idle session ${code} (students=${state.students.size})`);
        qpIo.to(code).emit(QP_SERVER_EVENTS.SESSION_ENDED, { sessionCode: code });
        qpSessions.delete(code);
      }
    }
  }, 60_000);

  // Clean shutdown hook: if the process is killed, release intervals so
  // tests / dev restarts don't leak timers.
  process.on("SIGTERM", () => {
    clearInterval(qpSweepInterval);
    qpJoinLimiter.shutdown();
    qpScoreLimiter.shutdown();
    qpTeacherLimiter.shutdown();
  });

  // Health check endpoint for monitoring — minimal info to avoid leaking server state
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  // Translation endpoint — server-side proxy to protect Google API key
  // Only authenticated teachers can access this
  // Translate a batch of English words to Hebrew + Arabic using Gemini.
  // Uses the same GOOGLE_AI_API_KEY that powers OCR/TTS — no extra setup.
  // Previously delegated to Google Translate API (separate key), which most
  // users never configured. Gemini produces noticeably better translations
  // for school vocabulary because it can disambiguate polysemous words from
  // context (e.g. "bank" as riverbank vs. financial institution).
  //
  // Response shape is unchanged: { hebrew: string[], arabic: string[] } in
  // input order, so existing frontend code keeps working.
  app.post("/api/translate", translateRateLimiter, async (req, res) => {
    const ip = req.ip || "unknown";
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn(`[abuse] /api/translate missing auth header: ip=${ip}`);
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.substring(7);
    const uid = await verifyToken(token);
    if (!uid) {
      console.warn(`[abuse] /api/translate invalid token: ip=${ip}`);
      return res.status(401).json({ error: "Invalid token" });
    }

    const userData = await getUserRoleAndClass(uid);
    if (!userData || userData.role !== "teacher") {
      console.warn(`[abuse] /api/translate non-teacher caller: ip=${ip} uid=${uid} role=${userData?.role ?? 'none'}`);
      return res.status(403).json({ error: "Only teachers can translate" });
    }

    const { words } = req.body;
    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: "words array required" });
    }

    const validWords = words
      .filter((w: unknown): w is string => typeof w === "string" && w.trim().length > 0)
      .slice(0, 100) // hard cap per request — 100 words is plenty for any single paste/OCR
      .map(w => w.trim());

    if (validWords.length === 0) {
      return res.status(400).json({ error: "No valid words provided" });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      return res.status(503).json({
        error: "Gemini API key not configured",
        message: "GOOGLE_AI_API_KEY is not set.",
      });
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      // gemini-2.5-flash-lite: cheapest tier in the 2.5 family
      // (~half the cost of `gemini-2.5-flash` per token, similar
      // quality for mechanical tasks like translation).  Chosen so the
      // "translate these 40 words" button stays cheap at classroom
      // scale.  Upgrade here if we ever need nuance the lite tier
      // can't deliver — translation is a well-solved task and lite
      // handles idioms + multi-word phrases fine.
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

      // Structured prompt so we can parse deterministically.
      // Now also produces Russian alongside Hebrew + Arabic.  Arabic
      // stays in the response even when the UI isn't showing it yet —
      // adding it later is a client-only flip.
      const prompt = `Translate these English words into Hebrew, Arabic, AND Russian. Return ONLY a JSON array with this exact shape — no prose, no markdown fences:
[{"english":"word","hebrew":"פירוש","arabic":"ترجمة","russian":"перевод"},...]

Rules:
- Output order MUST match input order.
- If the English word already appears as-is in a target language (proper noun, brand, etc.), copy it.
- Preserve pluralisation and grammatical form from the English input.
- For multi-word phrases, translate the phrase, not word-by-word.
- Never return an empty string — if you're unsure, transliterate phonetically.

Input:
${JSON.stringify(validWords)}`;

      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();
      const cleaned = raw.replace(/```json?\s*|\s*```/g, "").trim();

      let parsed: Array<{ english: string; hebrew: string; arabic: string; russian?: string }>;
      try {
        parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) throw new Error("not an array");
      } catch {
        console.error("[translate] Gemini returned unparseable response:", raw.slice(0, 200));
        return res.status(502).json({ error: "Translation parsing failed" });
      }

      // Align by input order. If Gemini returns fewer items than requested
      // (rare but possible), pad with empty strings so the arrays stay
      // positional — frontend can show an auto-translate button for gaps.
      const hebrew: string[] = [];
      const arabic: string[] = [];
      const russian: string[] = [];
      for (let i = 0; i < validWords.length; i++) {
        const item = parsed[i];
        hebrew.push(item?.hebrew?.trim() || "");
        arabic.push(item?.arabic?.trim() || "");
        russian.push(item?.russian?.trim() || "");
      }

      res.json({ hebrew, arabic, russian });
    } catch (error: any) {
      console.error("[translate] Gemini error:", error?.message || error);
      res.status(500).json({ error: "Translation failed", message: (error?.message || "").substring(0, 200) });
    }
  });

  // ── OCR via Claude Haiku Vision ───────────────────────────────────────────
  // Replaces Tesseract.js entirely. Tesseract had three problems:
  //   1. ~300 MB RAM per worker → crashed Render's 512 MB free tier
  //   2. 10-15s per request (cold start + recognition)
  //   3. Poor accuracy on phone photos (angles, shadows, blur)
  //
  // Claude Haiku Vision: 2-3s, excellent accuracy, ~$0.002/image, 0 MB RAM.
  // Uses the same ANTHROPIC_API_KEY already configured for AI sentences.

  // Auth gate for the OCR diagnostic endpoints. Both reveal partial details
  // about GOOGLE_AI_API_KEY (boolean presence, prefix/suffix, length, error
  // text from Google) — useful to a teacher debugging their setup, but a
  // recon goldmine for an unauthenticated attacker. Restrict to authenticated
  // teachers; the boolean shape stays the same so the in-app diagnostic page
  // still works.
  async function requireAuthenticatedTeacher(req: express.Request, res: express.Response): Promise<{ uid: string } | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return null;
    }
    const uid = await verifyToken(authHeader.substring(7));
    if (!uid) {
      res.status(401).json({ error: "Invalid token" });
      return null;
    }
    const userData = await getUserRoleAndClass(uid);
    if (!userData || (userData.role !== "teacher" && userData.role !== "admin")) {
      res.status(403).json({ error: "Forbidden" });
      return null;
    }
    return { uid };
  }

  app.get("/api/ocr/status", async (req, res) => {
    if (!(await requireAuthenticatedTeacher(req, res))) return;
    const key = process.env.GOOGLE_AI_API_KEY || "";
    // Booleans only — no key prefix/length leak. Even a valid teacher
    // doesn't need the raw key bytes; the prefix check is captured by
    // `keyStartsCorrectly`. Operators with shell access can run their
    // own diagnostic if they need more.
    res.json({
      engine: "gemini-flash",
      apiKeySet: !!key,
      keyStartsCorrectly: key.startsWith("AIza"),
      keyHasWhitespace: /\s/.test(key),
    });
  });

  // Diagnostic: test the Gemini API key with a minimal call
  app.get("/api/ocr/diagnostic", async (req, res) => {
    if (!(await requireAuthenticatedTeacher(req, res))) return;
    const key = process.env.GOOGLE_AI_API_KEY;
    if (!key) return res.status(503).json({ ok: false, reason: "GOOGLE_AI_API_KEY not set" });

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key.trim())}`,
        { method: "GET" }
      );
      const body = await response.json();
      if (!response.ok) {
        return res.json({
          ok: false,
          status: response.status,
          error: body?.error?.message || body,
          hint: body?.error?.message?.includes("API key not valid")
            ? "The key doesn't match any Google project. Create a new one at aistudio.google.com/apikey and paste it without quotes or spaces."
            : body?.error?.message?.includes("API has not been used")
            ? "The Generative Language API isn't enabled on this project. Enable it at console.cloud.google.com/apis/library/generativelanguage.googleapis.com"
            : null,
        });
      }
      const modelCount = Array.isArray(body?.models) ? body.models.length : 0;
      // Drop keyLength from response — irrelevant for a teacher debugging.
      return res.json({ ok: true, modelCount });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message });
    }
  });

  app.post("/api/ocr", ocrRateLimiter, (req: any, res: any, next: any) => {
    ocrUpload.single("file")(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: "Image too large (max 15 MB)" });
        }
        return res.status(400).json({ error: err.message || "File upload failed" });
      }
      next();
    });
  }, async (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.substring(7);
    const authData = await verifyTokenWithEmail(token);
    if (!authData) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const userData = await getUserRoleAndClass(authData.uid);
    if (!userData || userData.role !== "teacher") {
      return res.status(403).json({ error: "Only teachers can use OCR" });
    }

    const { allowed, error: gateErr } = await isPremiumTeacher(authData.email);
    if (gateErr) {
      return res.status(503).json({ error: "Feature gate check failed", message: gateErr });
    }
    if (!allowed) {
      return res.status(403).json({ error: "OCR is a premium feature", message: "Ask the admin to approve your account." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded, or invalid file type." });
    }

    // OCR powered by Google Gemini Flash (free tier: 1500 requests/day).
    // Gemini accepts images up to 20MB and handles HEIC/HEIF natively —
    // no base64 encoding, no size limits, no browser compression needed.
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "OCR not configured",
        message: "GOOGLE_AI_API_KEY is not set. Get a free key from https://aistudio.google.com/apikey",
      });
    }

    try {
      // Trim whitespace — common paste error in env var consoles
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      // gemini-2.5-flash: current stable production model with generous free tier.
      // Supports up to 1M tokens context and multimodal (image) input.
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Gemini accepts the raw image buffer directly via inlineData.
      //
      // MIME type: pass through whatever the upload claimed (jpeg/png/
      // webp/heic/heif).  Gemini 2.5 Flash supports all of these
      // natively per the API docs, including HEIC/HEIF from iPhones.
      //
      // The previous version of this code re-labelled HEIC as JPEG
      // ("image/heic" → "image/jpeg") WITHOUT converting the bytes,
      // which broke OCR for iPhone camera captures: the server told
      // Gemini "this is a JPEG" but the body was still HEIC, so
      // Gemini couldn't decode it and OCR failed silently on mobile.
      // The teacher reported this 2026-04-28; root cause was that
      // mislabelling.
      const mimeType = req.file.mimetype || "image/jpeg";

      // Prompt tuned to minimize hallucinations on mobile photos AND
      // preserve multi-word phrases as single entries. The old version
      // implicitly treated every token as a single word, so teachers
      // writing "turn on / look forward to / ice cream" on the board
      // got three separate flash-card entries instead of one phrase.
      //
      // Two core instructions now:
      //   1. Never invent.
      //   2. Keep phrases together: idioms, phrasal verbs, compound
      //      nouns, fixed expressions — whatever reads as a single
      //      unit on the page.
      const prompt = `Extract English vocabulary items from this image. Return ONLY a JSON array of lowercase strings, nothing else. Example: ["apple","turn on","ice cream","look forward to"]

Each array entry is ONE vocabulary item, which may be a single word OR a multi-word phrase. Preserve phrases intact — do not split them.

What counts as a multi-word phrase (keep together as ONE string):
- Phrasal verbs:        "turn on", "give up", "look forward to", "run out of"
- Compound nouns:       "ice cream", "post office", "high school", "best friend"
- Fixed expressions:    "at the same time", "on the other hand", "by the way"
- Prepositional phrases: "in front of", "next to", "because of"
- Hyphenated/joined words on the page: keep as written ("well-known", "sunshine")

How to tell phrase from separate words:
- Same line, close together, visually grouped (arrow, bullet, bracket) → probably a phrase
- Separated by commas, newlines, numbered bullets, or wide gaps → separate items
- Translation list where left column shows "turn on → להדליק": left column is ONE item "turn on"

Strict quality rules:
- Only include items you can read with high confidence
- If blurry, cropped, partially covered, or ambiguous → OMIT
- NEVER invent, guess, autocomplete, or infer items that aren't visibly present
- Do not merge two adjacent unrelated words into a phrase
- Do not split a phrase into its component words
- Do not split a single word into two ("sunshine" stays one word, not "sun" + "shine")
- Lowercase every string
- Remove exact duplicates (case-insensitive)
- Skip numbers, symbols, and non-English text (Hebrew, Arabic, etc.)
- If no English items are confidently readable, return []`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType,
          },
        },
      ]);

      const responseText = result.response.text();

      // Parse the JSON array from Gemini's response.
      // Entries may be multi-word phrases ("turn on", "ice cream") so
      // we preserve inner whitespace — only collapse runs of spaces
      // and trim the ends.
      let words: string[] = [];
      try {
        const cleaned = responseText.replace(/```json?\s*|\s*```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          words = parsed
            .filter((w: unknown): w is string => typeof w === "string" && w.trim().length >= 2)
            .map((w: string) => w.toLowerCase().replace(/\s+/g, " ").trim());
        }
      } catch {
        // Fallback: Gemini didn't return valid JSON. Split on commas +
        // newlines (the natural item separators), NOT whitespace, so
        // phrases stay together. Strip surrounding brackets/quotes, then
        // keep only tokens that look like English text (letters + spaces
        // + hyphens + apostrophes for contractions).
        words = responseText
          .replace(/[\[\]"`]/g, "")
          .split(/[,\n\r]+/)
          .map(s => s.trim().toLowerCase())
          .filter(s => /^[a-z][a-z '\-]{1,}[a-z]$/i.test(s));
      }

      // Case-insensitive dedup that keeps the first occurrence's casing.
      const seen = new Set<string>();
      const uniqueWords: string[] = [];
      for (const w of words) {
        const key = w.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          uniqueWords.push(w);
        }
      }

      const sizeKB = Math.round(req.file.size / 1024);
      console.log(`[OCR] ${authData.email}: Gemini Flash found ${uniqueWords.length} English words (image: ${sizeKB} KB, ${mimeType})`);

      res.json({
        words: uniqueWords,
        raw_text: responseText,
        success: true,
      });
    } catch (error: any) {
      // Log full error for debugging
      console.error("[OCR] Gemini error:", {
        message: error?.message,
        status: error?.status,
        statusText: error?.statusText,
        errorDetails: error?.errorDetails,
        stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
      });

      // Pass the RAW Gemini error message through to the client so we can
      // see the actual cause on mobile (no heuristic guessing that misleads).
      // Truncate to 200 chars to avoid dumping huge stack traces.
      const rawMessage = (error?.message || "Unknown error").toString().substring(0, 200);

      res.status(500).json({
        error: "OCR failed",
        message: `Gemini: ${rawMessage}`,
      });
    }
  });

  // ── Custom-word TTS generation ───────────────────────────────────────────
  // Teachers can add custom vocabulary via OCR, smart-paste, or quick-play.
  // Those words don't have prerecorded MP3s in the `sound/` bucket, so without
  // this endpoint students fall back to the robotic browser SpeechSynthesis
  // voice. This endpoint generates a Google Cloud TTS Neural2 MP3 per custom
  // word and uploads it to `sound/{wordId}.mp3` — the SAME path the client
  // already uses via `useAudio.speak(wordId)`. That means the frontend needs
  // zero awareness of "custom vs. curriculum": if the MP3 exists, it plays;
  // if it 404s, the existing failedWordIds → TTS fallback kicks in.
  //
  // Called fire-and-forget from the client right after custom words are
  // created, so the teacher never waits on it. By the time students start
  // playing an assignment, the files are in place.
  const ttsCustomLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many TTS requests. Please wait a minute." },
    keyGenerator: (req) => req.headers.authorization?.substring(7) || ipKeyGenerator(req.ip || "unknown") || "unknown",
  });

  app.post("/api/tts/custom-words", ttsCustomLimiter, async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const authData = await verifyTokenWithEmail(authHeader.substring(7));
    if (!authData) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const userData = await getUserRoleAndClass(authData.uid);
    if (!userData || userData.role !== "teacher") {
      return res.status(403).json({ error: "Only teachers can generate custom audio" });
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "TTS not configured", message: "GOOGLE_AI_API_KEY is not set." });
    }
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Supabase not configured" });
    }

    // Expect { words: [{ id: number, english: string }, ...] }
    const rawWords = Array.isArray(req.body?.words) ? req.body.words : null;
    if (!rawWords) {
      return res.status(400).json({ error: "Body must be { words: [{id, english}] }" });
    }

    const words = rawWords
      .filter((w: unknown): w is { id: number; english: string } =>
        typeof w === "object" && w !== null &&
        typeof (w as any).id === "number" &&
        typeof (w as any).english === "string" &&
        (w as any).english.trim().length > 0 &&
        (w as any).english.length <= 100
      )
      .slice(0, 500); // hard cap — 500 words per request is plenty

    if (words.length === 0) {
      return res.status(400).json({ error: "No valid words in request" });
    }

    // Process in small parallel batches so Google TTS doesn't rate-limit us
    // and we don't open 500 concurrent HTTPS connections.
    const BATCH_SIZE = 5;
    let generated = 0, skipped = 0, failed = 0;
    const failures: { english: string; reason: string }[] = [];

    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      const batch = words.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (w) => {
        const fileName = `${w.id}.mp3`;
        try {
          // Skip if already uploaded (idempotent — safe to call twice).
          const { data: existing } = await supabaseAdmin.storage
            .from("sound")
            .list("", { search: fileName, limit: 1 });
          if (existing && existing.some((f) => f.name === fileName)) {
            skipped++;
            return;
          }

          const mp3 = await synthesizeSpeechMp3(w.english.trim(), apiKey);
          const { error: uploadErr } = await supabaseAdmin.storage
            .from("sound")
            .upload(fileName, mp3, { contentType: "audio/mpeg", upsert: true });
          if (uploadErr) {
            failed++;
            failures.push({ english: w.english, reason: uploadErr.message });
            return;
          }
          generated++;
        } catch (err: any) {
          failed++;
          failures.push({ english: w.english, reason: (err?.message || "unknown").substring(0, 200) });
        }
      }));
    }

    console.log(`[TTS] ${authData.email}: generated=${generated} skipped=${skipped} failed=${failed}`);
    if (failures.length > 0) {
      console.warn(`[TTS] failures:`, failures.slice(0, 5));
    }

    res.json({ generated, skipped, failed, total: words.length });
  });

  // AI feature gate — checks if the authenticated teacher has AI access.
  // Two layers: ANTHROPIC_API_KEY must be set AND teacher email in ai_allowlist.
  // Logs the exact reason for aiSentences=false so Render logs can diagnose
  // "why doesn't the AI button show up" without needing devtools access.
  //
  // Additionally, when the query param ?debug=1 is passed, the response body
  // includes a `reason` field so the user can see the failure mode in the
  // browser DevTools Network tab without having to check Render logs at all.
  // Safe to expose because the reasons are generic enum-like strings that
  // don't leak user data beyond what the allowlist admin already knows.
  app.get("/api/features", async (req, res) => {
    const debug = req.query.debug === "1";
    const reply = (aiSentences: boolean, reason?: string, extra?: Record<string, unknown>) =>
      res.json(debug ? { aiSentences, reason, ...extra } : { aiSentences });

    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("[features] aiSentences=false: ANTHROPIC_API_KEY env var not set on the server");
      return reply(false, "no_anthropic_key");
    }
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[features] aiSentences=false: request missing Authorization: Bearer header");
      return reply(false, "no_auth_header");
    }
    const authData = await verifyTokenWithEmail(authHeader.substring(7));
    if (!authData) {
      console.log("[features] aiSentences=false: token verification failed (invalid or expired)");
      return reply(false, "invalid_token");
    }
    const userData = await getUserRoleAndClass(authData.uid);
    if (!userData || userData.role !== "teacher") {
      console.log(`[features] aiSentences=false: user is not a teacher (role=${userData?.role ?? "none"}, email=${authData.email})`);
      return reply(false, "not_teacher", { role: userData?.role ?? null });
    }
    const { allowed, error } = await isPremiumTeacher(authData.email);
    if (error) {
      console.error(`[features] ai_allowlist check error for ${authData.email}: ${error}`);
      return reply(false, "allowlist_error");
    }
    if (!allowed) {
      // SQL hint kept in the SERVER LOG only (operator's eyes), never in
      // the response body — operators have Render log access; the body
      // is shipped over the network and could end up in shared logs.
      console.log(`[features] aiSentences=false: ${authData.email} is not in ai_allowlist (run: INSERT INTO public.ai_allowlist (email) VALUES ('${authData.email}');)`);
      return reply(false, "not_in_allowlist");
    }
    console.log(`[features] aiSentences=true for ${authData.email}`);
    return reply(true, "ok");
  });

  // Diagnostic endpoint: reports whether key env vars are set (boolean only).
  // Used to verify a deploy has actually picked up an env var change.
  // Authenticated to teachers/admins to avoid leaking deploy/branch metadata
  // and the literal allowed-origin list to unauthenticated reconnaissance.
  // Operators with shell access can `fly logs` for richer detail.
  app.get("/api/version", async (req, res) => {
    if (!(await requireAuthenticatedTeacher(req, res))) return;
    res.json({
      commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || "unknown",
      nodeEnv: process.env.NODE_ENV || "unknown",
      env: {
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasAllowedOrigin: !!process.env.ALLOWED_ORIGIN,
      },
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Quick Play session lookup (public, service-role) ─────────────
  // Frontend bootstrap calls this as a fallback when the direct
  // Supabase REST query fails — typically because:
  //   (a) anonymous sign-ins are disabled at the Supabase project
  //       level → POST /auth/v1/signup returns 400 → guest has no
  //       session → RLS filters them to 0 rows → 406, OR
  //   (b) the SELECT policy on quick_play_sessions doesn't list anon
  //       (the migration `20260516_qp_sessions_select_anon.sql` adds
  //       the role; if it hasn't run, anon role is filtered to 0
  //       rows → 406).
  // This endpoint sidesteps both by using the service role key, which
  // bypasses RLS entirely.  Safe to expose unauthenticated because QP
  // sessions are designed to be public-by-code (anyone with the QR
  // can join), and we only return rows where is_active=true.  Rate
  // limited to make code-guessing painful.
  const qpSessionLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60, // 60 lookups/min/IP — generous for a classroom of 30
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many lookups, please try again in a minute." },
  });
  app.get("/api/quick-play/session/:code", qpSessionLimiter, async (req, res) => {
    const code = req.params.code;
    if (!code || !/^[A-Z0-9]{4,8}$/i.test(code)) {
      return res.status(400).json({ error: "Invalid session code format" });
    }
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Server not configured" });
    }
    try {
      const { data, error } = await supabaseAdmin
        .from("quick_play_sessions")
        .select("*")
        .eq("session_code", code.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();
      if (error) {
        console.error("[qp-session-lookup] supabase error:", error);
        return res.status(500).json({ error: "Lookup failed" });
      }
      if (!data) {
        return res.status(404).json({ error: "Session not found or no longer active" });
      }
      return res.json(data);
    } catch (err) {
      console.error("[qp-session-lookup] exception:", err);
      return res.status(500).json({ error: "Internal error" });
    }
  });

  // AI sentence generation — rate limited per teacher
  const aiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many AI requests. Please wait a minute before trying again." },
    keyGenerator: (req) => req.headers.authorization?.substring(7) || ipKeyGenerator(req.ip || "unknown") || "unknown",
  });

  const DIFFICULTY_DESCRIPTIONS: Record<number, string> = {
    1: "Simple 3-5 word sentences. Present tense. Basic SVO structure.",
    2: "5-7 word sentences. Past/present tense. Common vocabulary.",
    3: "7-10 word sentences. Relative clauses. Mixed tenses.",
    4: "10-15 word sentences. Complex grammar. Conditionals.",
  };

  app.post("/api/generate-sentences", aiRateLimiter, async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = authHeader.substring(7);
    const uid = await verifyToken(token);
    if (!uid) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const userData = await getUserRoleAndClass(uid);
    if (!userData || userData.role !== "teacher") {
      return res.status(403).json({ error: "Only teachers can generate sentences" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI sentence generation not configured" });
    }

    const { words, difficulty } = req.body;
    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: "words array required" });
    }
    if (words.length > 50) {
      return res.status(400).json({ error: "Maximum 50 words per request" });
    }
    const validWords = words.filter((w: string) => typeof w === "string" && w.trim().length > 0 && w.length <= 500);
    if (validWords.length === 0) {
      return res.status(400).json({ error: "No valid words provided" });
    }
    const diff = [1, 2, 3, 4].includes(difficulty) ? difficulty : 2;

    try {
      // Check cache first
      const cached: Record<string, string> = {};
      const uncachedWords: string[] = [];

      if (supabaseAdmin) {
        const { data: cacheHits } = await supabaseAdmin
          .from("sentence_cache")
          .select("word, sentence")
          .in("word", validWords.map((w: string) => w.toLowerCase()))
          .eq("difficulty", diff);
        if (cacheHits) {
          for (const hit of cacheHits) {
            cached[hit.word] = hit.sentence;
          }
        }
      }

      for (const w of validWords) {
        if (!cached[w.toLowerCase()]) {
          uncachedWords.push(w);
        }
      }

      // Call AI for uncached words
      if (uncachedWords.length > 0) {
        const anthropic = new Anthropic({ apiKey });
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: `You generate English sentences for Israeli EFL students (grades 4-9) used in vocabulary practice games.  Output is consumed by two modes: Sentence Builder (student rebuilds the sentence from shuffled words) and Fill in the Blank (the target word is removed and the student picks it from a 4-option list).  Both modes need the SAME quality from a sentence — the target word must fit naturally and the rest of the sentence must hint at it.

Difficulty: ${DIFFICULTY_DESCRIPTIONS[diff]}

CRITICAL RULES — every sentence must satisfy ALL of these:
1. The target word appears EXACTLY as given (same form, same spelling, no inflection).
2. The target word fits the sentence NATURALLY — it is the obvious word for that slot.  If the sentence reads weirdly with the word inserted, REWRITE the sentence around the word.
3. The surrounding words give CONTEXT for the target word — a student reading the sentence with the word removed should be able to guess it from the rest.
4. Concrete and visual — avoid abstract metaphors or idioms.  Vocabulary level for grades 4-9.
5. One sentence per line, no numbering, no quotes, no extra text.

Examples of good vs bad sentences:
- Word "apple"  GOOD: "I ate a sweet red apple after lunch."  (context: ate, sweet, red, lunch all hint at a fruit)
- Word "apple"  BAD:  "The apple was important to me."  (no context — could be any noun)
- Word "run"    GOOD: "Every morning I run two kilometres in the park."  (context: morning, park, kilometres hint at exercise)
- Word "run"    BAD:  "The run was nice yesterday."  (no context)
- Word "happy"  GOOD: "The children were so happy when they opened their presents."  (context: children, presents hint at an emotion of joy)
- Word "happy"  BAD:  "He felt happy."  (too short, no context)`,
          messages: [{ role: "user", content: `Generate one sentence for each word:\n${uncachedWords.join("\n")}` }],
        });

        const text = response.content[0].type === "text" ? response.content[0].text : "";
        const lines = text.split("\n").filter(l => l.trim());

        for (let i = 0; i < uncachedWords.length; i++) {
          const sentence = lines[i]?.trim() || `I like the word ${uncachedWords[i]}.`;
          cached[uncachedWords[i].toLowerCase()] = sentence;

          // Store in cache (fire and forget)
          if (supabaseAdmin) {
            supabaseAdmin
              .from("sentence_cache")
              .upsert({ word: uncachedWords[i].toLowerCase(), difficulty: diff, sentence }, { onConflict: "word,difficulty" })
              .then(() => {});
          }
        }
      }

      // Return sentences in the same order as input
      const sentences = validWords.map((w: string) => cached[w.toLowerCase()] || `I like the word ${w}.`);
      res.json({ sentences });
    } catch (error: any) {
      console.error("AI generation error:", error?.message || error);
      res.status(500).json({ error: "AI sentence generation failed" });
    }
  });

  // AI Vocabulary Generator — Stage 1 of AI Lesson Builder
  // Takes a topic + level + count, returns vocabulary words with translations.
  app.post("/api/ai-generate-words", aiRateLimiter, async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = authHeader.substring(7);
    const uid = await verifyToken(token);
    if (!uid) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const userData = await getUserRoleAndClass(uid);
    if (!userData || userData.role !== "teacher") {
      return res.status(403).json({ error: "Only teachers can generate vocabulary" });
    }

    const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI vocabulary generation not configured" });
    }

    const { topic, level, examplesToAnchor, skipCurriculumDuplicates } = req.body;
    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return res.status(400).json({ error: "topic is required (non-empty string)" });
    }
    if (topic.length > 200) {
      return res.status(400).json({ error: "topic too long (max 200 characters)" });
    }
    const validLevels = ["A1", "A2", "B1", "B2"];
    if (!level || !validLevels.includes(level)) {
      return res.status(400).json({ error: `level must be one of: ${validLevels.join(", ")}` });
    }
    if (examplesToAnchor !== undefined && typeof examplesToAnchor !== "string") {
      return res.status(400).json({ error: "examplesToAnchor must be a string" });
    }

    try {
      console.log(`[AI Words] ${userData.email || uid}: topic="${topic}" level=${level}`);

      // Build the prompt for Gemini (always 20 words, mixed types)
      const exampleHint = examplesToAnchor?.trim()
        ? `Use these words as style guides: ${examplesToAnchor}`
        : "";

      const duplicateHint = skipCurriculumDuplicates !== false
        ? `IMPORTANT: Avoid common curriculum words like "run, jump, play, book, school, teacher, student, family, friend, house, food, water." Pick more specific, interesting vocabulary.`
        : "";

      const prompt = `Generate 20 English vocabulary words for Israeli EFL students at ${level} level (CEFR).

Topic: ${topic.trim()}

Include a mix of nouns, verbs, and adjectives.
${exampleHint}
${duplicateHint}

Return a JSON array where each item has:
{
  "english": "word",
  "hebrew": "translation",
  "arabic": "translation",
  "example": "short simple sentence using the word (optional)"
}

Requirements:
- Words must be appropriate for grades 4-9
- Hebrew and Arabic translations should be accurate
- Example sentences should be 8-15 words, simple structure
- Output ONLY the JSON array, no markdown, no explanations

Example output format:
[
  {"english": "weather", "hebrew": "מזג אוויר", "arabic": "الطقس", "example": "The weather is sunny today."},
  {"english": "temperature", "hebrew": "טמפרטורה", "arabic": "درجة الحرارة", "example": "The temperature is very high."}
]`;

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON from Gemini response (it might include markdown code blocks)
      let jsonText = text.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.slice(7);
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      let generatedWords: Array<{
        english: string;
        hebrew: string;
        arabic: string;
        example?: string;
      }>;

      try {
        generatedWords = JSON.parse(jsonText);
      } catch (parseError) {
        console.warn("[AI Words] JSON parse failed, trying to extract array:", parseError);
        // Try to extract JSON array from text
        const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          generatedWords = JSON.parse(arrayMatch[0]);
        } else {
          throw new Error("Failed to parse AI response as JSON");
        }
      }

      if (!Array.isArray(generatedWords)) {
        throw new Error("AI response is not an array");
      }

      // Validate and sanitize each word
      const sanitizedWords = generatedWords
        .filter(w => w && typeof w === "object")
        .filter(w => typeof w.english === "string" && w.english.trim().length > 0)
        .filter(w => typeof w.hebrew === "string" && w.hebrew.trim().length > 0)
        .filter(w => typeof w.arabic === "string" && w.arabic.trim().length > 0)
        .map(w => ({
          english: w.english.trim().toLowerCase(),
          hebrew: w.hebrew.trim(),
          arabic: w.arabic.trim(),
          example: w.example && typeof w.example === "string" ? w.example.trim() : undefined,
        }))
        .filter(w => w.english.length <= 50 && w.hebrew.length <= 100 && w.arabic.length <= 100)
        .slice(0, 30); // Cap at 30 words max

      console.log(`[AI Words] generated ${sanitizedWords.length} words`);

      res.json({ words: sanitizedWords });
    } catch (error: any) {
      console.error("[AI Words] generation error:", error?.message || error);
      res.status(500).json({ error: "AI vocabulary generation failed" });
    }
  });

  // AI Reading Text Processor — Stage 2 of AI Lesson Builder
  // Takes a text + level, extracts key vocabulary and generates comprehension questions.
  app.post("/api/ai-process-text", aiRateLimiter, async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = authHeader.substring(7);
    const uid = await verifyToken(token);
    if (!uid) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const userData = await getUserRoleAndClass(uid);
    if (!userData || userData.role !== "teacher") {
      return res.status(403).json({ error: "Only teachers can process text" });
    }

    const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI text processing not configured" });
    }

    const { text, level, extractVocab = true, generateQuestions = true } = req.body;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "text is required (non-empty string)" });
    }
    if (text.length > 10000) {
      return res.status(400).json({ error: "text too long (max 10,000 characters)" });
    }
    const validLevels = ["A1", "A2", "B1", "B2"];
    if (!level || !validLevels.includes(level)) {
      return res.status(400).json({ error: `level must be one of: ${validLevels.join(", ")}` });
    }

    try {
      console.log(`[AI Text] ${userData.email || uid}: processing text (${text.length} chars) level=${level}`);

      const trimmedText = text.trim();
      const wordCount = trimmedText.split(/\s+/).length;

      // Build prompt based on what's requested
      let prompt = `Process the following text for Israeli EFL students at ${level} level (CEFR).

Text (${wordCount} words):
"""${trimmedText}"""

`;

      if (extractVocab) {
        prompt += `
Extract 10-15 key vocabulary words from this text that:
- Are important for understanding the text
- Are appropriate for ${level} level
- May be challenging for students

For each word, provide:
- english: the word from the text
- hebrew: Hebrew translation
- arabic: Arabic translation
- example: a short example sentence using the word (can be from the text or new)
`;
      }

      if (generateQuestions) {
        prompt += `
Generate 5-8 comprehension questions about this text:
- Mix of literal and inferential questions
- Appropriate for ${level} level
- Include the answer for each question

Each question should have:
- question: the question text
- answer: the correct answer
- type: either "literal" (facts from text) or "inferential" (requires thinking)
`;
      }

      prompt += `
Return ONLY a JSON object with this exact structure:
${extractVocab && generateQuestions ? `{
  "vocabulary": [
    {"english": "word", "hebrew": "translation", "arabic": "translation", "example": "sentence"}
  ],
  "questions": [
    {"question": "...", "answer": "...", "type": "literal"}
  ]
}` : extractVocab ? `{
  "vocabulary": [
    {"english": "word", "hebrew": "translation", "arabic": "translation", "example": "sentence"}
  ]
}` : `{
  "questions": [
    {"question": "...", "answer": "...", "type": "literal"}
  ]
}`}

Output ONLY the JSON, no markdown, no explanations.
`;

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text().trim();

      // Parse JSON from Gemini response (it might include markdown code blocks)
      let parsedText = jsonText;
      if (parsedText.startsWith("```json")) {
        parsedText = parsedText.slice(7);
      } else if (parsedText.startsWith("```")) {
        parsedText = parsedText.slice(3);
      }
      if (parsedText.endsWith("```")) {
        parsedText = parsedText.slice(0, -3);
      }
      parsedText = parsedText.trim();

      let resultData: {
        vocabulary?: Array<{ english: string; hebrew: string; arabic: string; example?: string }>;
        questions?: Array<{ question: string; answer: string; type: "literal" | "inferential" }>;
      };

      try {
        resultData = JSON.parse(parsedText);
      } catch (parseError) {
        console.warn("[AI Text] JSON parse failed, trying to extract object:", parseError);
        const objectMatch = parsedText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          resultData = JSON.parse(objectMatch[0]);
        } else {
          throw new Error("Failed to parse AI response as JSON");
        }
      }

      // Sanitize vocabulary
      const sanitizedVocab = (resultData.vocabulary || [])
        .filter(w => w && typeof w === "object")
        .filter(w => typeof w.english === "string" && w.english.trim().length > 0)
        .filter(w => typeof w.hebrew === "string" && w.hebrew.trim().length > 0)
        .filter(w => typeof w.arabic === "string" && w.arabic.trim().length > 0)
        .map(w => ({
          english: w.english.trim().toLowerCase(),
          hebrew: w.hebrew.trim(),
          arabic: w.arabic.trim(),
          example: w.example && typeof w.example === "string" ? w.example.trim() : undefined,
        }))
        .filter(w => w.english.length <= 50 && w.hebrew.length <= 100 && w.arabic.length <= 100)
        .slice(0, 20);

      // Sanitize questions
      const sanitizedQuestions = (resultData.questions || [])
        .filter(q => q && typeof q === "object")
        .filter(q => typeof q.question === "string" && q.question.trim().length > 0)
        .filter(q => typeof q.answer === "string" && q.answer.trim().length > 0)
        .map(q => ({
          question: q.question.trim(),
          answer: q.answer.trim(),
          type: q.type === "inferential" ? "inferential" as const : "literal" as const,
        }))
        .slice(0, 10);

      console.log(`[AI Text] ${userData.email || uid}: extracted ${sanitizedVocab.length} words, ${sanitizedQuestions.length} questions`);

      const responsePayload: {
        vocabulary: typeof sanitizedVocab;
        questions: typeof sanitizedQuestions;
      } = {
        vocabulary: sanitizedVocab,
        questions: sanitizedQuestions,
      };

      res.json(responsePayload);
    } catch (error: any) {
      console.error("[AI Text] processing error:", error?.message || error);
      res.status(500).json({ error: "AI text processing failed" });
    }
  });

  // AI Lesson Generator — Phase 3: Unified lesson generation
  // Takes selected words + teacher preferences, generates a complete lesson
  // with reading text and various question types.
  app.post("/api/ai-generate-lesson", aiRateLimiter, async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = authHeader.substring(7);
    const uid = await verifyToken(token);
    if (!uid) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const userData = await getUserRoleAndClass(uid);
    if (!userData || userData.role !== "teacher") {
      return res.status(403).json({ error: "Only teachers can generate lessons" });
    }

    const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI lesson generation not configured" });
    }

    const { words, config } = req.body;
    if (!words || !Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: "words is required (non-empty array)" });
    }
    if (words.length > 100) {
      return res.status(400).json({ error: "too many words (max 100)" });
    }
    if (!config || typeof config !== "object") {
      return res.status(400).json({ error: "config is required" });
    }
    if (!config.textDifficulty || typeof config.textDifficulty !== "string") {
      return res.status(400).json({ error: "config.textDifficulty is required" });
    }
    if (config.wordCount && (typeof config.wordCount !== "number" || config.wordCount < 50 || config.wordCount > 2000)) {
      return res.status(400).json({ error: "config.wordCount must be between 50 and 2000" });
    }
    if (!config.questionTypes || typeof config.questionTypes !== "object") {
      return res.status(400).json({ error: "config.questionTypes is required" });
    }

    try {
      console.log(`[AI Lesson] ${userData.email || uid}: ${words.length} words, ${config.wordCount || 200} target words`);

      const targetWordCount = config.wordCount || 200;
      const wordList = words.map((w: any) => w.english || w).join(", ");

      // Count total questions requested
      const totalQuestions = Object.values(config.questionTypes).reduce((sum: number, val: any) => sum + (val || 0), 0);

      // Build question type specifications
      const questionTypeSpecs: string[] = [];
      const typeMapping: Record<string, string> = {
        yesNo: "Yes/No questions",
        wh: "WH-questions (who, what, where, when, why, how)",
        literal: "literal comprehension questions (facts directly from the text)",
        inferential: "inferential/thinking questions (require understanding beyond the text)",
        fillBlank: "fill-in-the-blank exercises with missing words from the text",
        trueFalse: "true/false questions based on the text",
        matching: "matching exercises (match items from column A to column B)",
        multipleChoice: "multiple choice questions with 4 options each",
        sentenceComplete: "sentence completion exercises",
      };

      for (const [key, count] of Object.entries(config.questionTypes)) {
        if (count > 0 && typeMapping[key]) {
          questionTypeSpecs.push(`- ${count} ${typeMapping[key]}`);
        }
      }

      const prompt = `You are an expert English teacher for Israeli EFL students. Create a lesson using the following vocabulary words.

Vocabulary words: ${wordList}

Student level: ${config.textDifficulty}
Text type: ${config.textType || "Create a coherent, engaging text"}

PART 1: READING TEXT
Generate a text of approximately ${targetWordCount} words that:
- Naturally incorporates ALL the vocabulary words above
- Is appropriate for the student level described
- Is coherent, engaging, and well-structured
- Has a clear beginning, middle, and end

PART 2: QUESTIONS
Generate exactly ${totalQuestions} questions based on the text:
${questionTypeSpecs.length > 0 ? questionTypeSpecs.join("\n") : "- A mix of comprehension questions"}

${config.includeAnswers !== false ? "Include the correct answer for each question." : ""}

Return ONLY a JSON object with this exact structure:
{
  "text": "The complete reading text with all vocabulary words naturally integrated...",
  "questions": [
    {
      "type": "yesNo",
      "question": "Is the main character brave?",
      "answer": "Yes"
    },
    {
      "type": "wh",
      "question": "Where does the story take place?",
      "answer": "In a small village near the mountains"
    },
    {
      "type": "literal",
      "question": "What did Sarah find?",
      "answer": "She found an old key"
    },
    {
      "type": "inferential",
      "question": "Why did the protagonist decide to return home?",
      "answer": "Because she realized her family was more important than her adventure"
    },
    {
      "type": "fillBlank",
      "question": "Sarah opened the _____ door.",
      "answer": "old wooden"
    },
    {
      "type": "trueFalse",
      "question": "The weather was sunny throughout the story.",
      "answer": "False"
    },
    {
      "type": "matching",
      "question": "Match each character to their action",
      "answer": "Sarah - found the key, Tom - helped search, Mom - made dinner"
    },
    {
      "type": "multipleChoice",
      "question": "What was the main theme of the story?",
      "answer": "The importance of family",
      "options": ["Friendship", "Adventure", "The importance of family", "Courage"]
    },
    {
      "type": "sentenceComplete",
      "question": "Complete the sentence: The old key _____ to a mysterious door.",
      "answer": "opened"
    }
  ]
}

Important notes:
- For multiple choice: always include 4 options in the "options" array
- For matching: include all pairs in the answer
- For fill-in-blank: use _____ to show the blank
- Make sure ALL vocabulary words are used naturally in the text
- Output ONLY the JSON, no markdown, no explanations
`;

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let jsonText = response.text().trim();

      // Parse JSON from Gemini response
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.slice(7);
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      let lessonData: {
        text: string;
        questions: Array<{
          type: string;
          question: string;
          answer: string;
          options?: string[];
        }>;
      };

      try {
        lessonData = JSON.parse(jsonText);
      } catch (parseError) {
        console.warn("[AI Lesson] JSON parse failed, trying to extract object:", parseError);
        const objectMatch = jsonText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          lessonData = JSON.parse(objectMatch[0]);
        } else {
          throw new Error("Failed to parse AI response as JSON");
        }
      }

      if (!lessonData.text || typeof lessonData.text !== "string") {
        throw new Error("Invalid response: missing text");
      }
      if (!Array.isArray(lessonData.questions)) {
        throw new Error("Invalid response: missing questions array");
      }

      // Sanitize
      const sanitizedText = lessonData.text.trim().slice(0, 10000);
      const sanitizedQuestions = lessonData.questions
        .filter(q => q && typeof q === "object")
        .filter(q => typeof q.question === "string" && q.question.trim().length > 0)
        .filter(q => typeof q.answer === "string" && q.answer.trim().length > 0)
        .filter(q => ["yesNo", "wh", "literal", "inferential", "fillBlank", "trueFalse", "matching", "multipleChoice", "sentenceComplete"].includes(q.type))
        .map(q => ({
          type: q.type,
          question: q.question.trim(),
          answer: q.answer.trim(),
          options: Array.isArray(q.options) ? q.options.slice(0, 6).map(o => String(o).trim()) : undefined,
        }))
        .slice(0, 100);

      // Count words in generated text
      const actualWordCount = sanitizedText.split(/\s+/).length;

      console.log(`[AI Lesson] ${userData.email || uid}: generated ${actualWordCount} words, ${sanitizedQuestions.length} questions`);

      res.json({
        text: sanitizedText,
        wordCount: actualWordCount,
        questions: sanitizedQuestions,
      });
    } catch (error: any) {
      console.error("[AI Lesson] generation error:", error?.message || error);
      res.status(500).json({ error: "AI lesson generation failed" });
    }
  });

  // ─── Vocabagrut — Bagrut-style mock exam generator ─────────────────────
  // Source-of-truth for module metadata is src/features/vocabagrut/lib/moduleMap.ts.
  // Per-module model selection: A and B (easier modules, A2/B1) → Haiku.
  // C, D, E (B1+) → Sonnet, where inference question quality matters.

  const MODEL_BY_MODULE: Record<BagrutModule, string> = {
    A: "claude-haiku-4-5-20251001",
    B: "claude-haiku-4-5-20251001",
    C: "claude-sonnet-4-6",
    D: "claude-sonnet-4-6",
    E: "claude-sonnet-4-6",
  };

  // English teachers will batch — generate a week of tests for several
  // classes in one sitting.  Per-token (per-teacher) limits intentionally
  // higher than the sentence generator.
  const bagrutHourLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "You've generated 30 mock exams in the last hour. Take a break and try again shortly." },
    keyGenerator: (req) => req.headers.authorization?.substring(7) || ipKeyGenerator(req.ip || "unknown") || "unknown",
  });
  const bagrutDayLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Daily Vocabagrut limit reached (200/day). Resets in 24 hours." },
    keyGenerator: (req) => req.headers.authorization?.substring(7) || ipKeyGenerator(req.ip || "unknown") || "unknown",
  });

  const WORD_RE = /^[a-zA-Z\-']{1,30}$/;
  function sanitizeWords(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of input) {
      if (typeof raw !== "string") continue;
      const trimmed = raw.trim().toLowerCase();
      if (!WORD_RE.test(trimmed)) continue;
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
      if (out.length >= 60) break;
    }
    return out;
  }

  function bagrutCacheKey(module: BagrutModule, model: string, words: string[]): string {
    const sorted = [...words].sort().join("|");
    return createHash("sha256").update(`${module}:${model}:${sorted}`).digest("hex");
  }

  app.post("/api/generate-bagrut", bagrutDayLimiter, bagrutHourLimiter, async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = authHeader.substring(7);
    const auth = await verifyTokenWithEmail(token);
    if (!auth) return res.status(401).json({ error: "Invalid token" });

    const userData = await getUserRoleAndClass(auth.uid);
    if (!userData || userData.role !== "teacher") {
      return res.status(403).json({ error: "Only teachers can generate mock exams" });
    }

    // Same gate as other premium AI features — must be in ai_allowlist.
    const { allowed, error: gateErr } = await isPremiumTeacher(auth.email);
    if (gateErr) return res.status(503).json({ error: gateErr });
    if (!allowed) return res.status(403).json({ error: "Vocabagrut is a premium feature. Contact your administrator to be added to the allowlist." });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "AI generation not configured" });

    const { module, words } = req.body ?? {};
    if (typeof module !== "string" || !(module in MODEL_BY_MODULE)) {
      return res.status(400).json({ error: "module must be one of A|B|C|D|E" });
    }
    const moduleTyped = module as BagrutModule;
    if (!MODULE_SPECS[moduleTyped].available) {
      return res.status(400).json({ error: `Module ${moduleTyped} is not yet available. v1 supports A, B, C.` });
    }

    const sanitized = sanitizeWords(words);
    if (sanitized.length === 0) {
      return res.status(400).json({ error: "Provide at least one valid English word" });
    }

    const model = MODEL_BY_MODULE[moduleTyped];
    const cacheKey = bagrutCacheKey(moduleTyped, model, sanitized);

    // ── Cache lookup ────────────────────────────────────────────────
    if (supabaseAdmin) {
      try {
        const { data: cached } = await supabaseAdmin
          .from("bagrut_cache")
          .select("content, expires_at")
          .eq("cache_key", cacheKey)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        if (cached?.content) {
          // Fire-and-forget hit counter; don't block the response on it.
          supabaseAdmin
            .from("bagrut_cache")
            .update({ hits: (cached as any).hits != null ? (cached as any).hits + 1 : 1 })
            .eq("cache_key", cacheKey)
            .then(() => {});
          return res.json({ test: cached.content, cached: true, model });
        }
      } catch (err) {
        console.warn("[bagrut] cache lookup failed:", err);
      }
    }

    // ── Generate ────────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey });
    const promptInput = { module: moduleTyped, words: sanitized };
    const systemPrompt = buildSystemPrompt(promptInput);
    const userMessage = buildUserMessage(promptInput);

    let attempt = 0;
    let lastError = "";
    let validated: BagrutTest | null = null;

    while (attempt < 2 && !validated) {
      attempt++;
      try {
        // Anthropic prompt caching: mark the system prompt block cacheable.
        // The 5-minute cache yields a ~90% input-token discount on subsequent
        // calls within the window — significant when teachers batch.
        const response = await anthropic.messages.create({
          model,
          max_tokens: 4096,
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          tools: [BAGRUT_TOOL as any],
          tool_choice: { type: "tool", name: "bagrut_test" },
          messages: [
            {
              role: "user",
              content: attempt === 1
                ? userMessage
                : `${userMessage}\n\nThe previous attempt failed validation: ${lastError}. Fix that field and try again.`,
            },
          ],
        });

        const toolUse = response.content.find(b => b.type === "tool_use");
        if (!toolUse || toolUse.type !== "tool_use") {
          lastError = "model did not return a tool_use block";
          continue;
        }

        const result = validateBagrutTest(toolUse.input);
        if (!result.ok) {
          lastError = result.error;
          continue;
        }
        validated = result.value;
      } catch (err: any) {
        console.error("[bagrut] anthropic call failed:", err?.message || err);
        return res.status(502).json({ error: "AI service unavailable", detail: err?.message || String(err) });
      }
    }

    if (!validated) {
      console.warn("[bagrut] generation failed after retry. lastError:", lastError);
      return res.status(502).json({ error: "Generation failed validation", detail: lastError });
    }

    // ── Cache write (fire-and-forget) ───────────────────────────────
    if (supabaseAdmin) {
      supabaseAdmin
        .from("bagrut_cache")
        .upsert({
          cache_key: cacheKey,
          module: moduleTyped,
          model,
          content: validated,
        }, { onConflict: "cache_key" })
        .then(() => {});
    }

    res.json({ test: validated, cached: false, model });
  });

  // Per-student rate limit for bagrut submissions/lookups. A real student
  // submits a single test once and reviews it a few times. Anything beyond
  // 60/min/token is either retry-storm or scripted abuse — drop it.
  const bagrutStudentLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait a minute before trying again." },
    keyGenerator: (req) => req.headers.authorization?.substring(7) || ipKeyGenerator(req.ip || "unknown") || "unknown",
  });

  // bagrut_tests question IDs follow a stable shape (e.g. "q1", "1a", "mc-3").
  // Anything else is either a typo from the model or a hostile client trying
  // to bloat answers JSONB. Cap to a conservative regex + length.
  const BAGRUT_ANSWER_KEY_RE = /^[A-Za-z0-9_-]{1,32}$/;

  // Server-side auto-grade for student MC submissions.  Recomputes the score
  // from the canonical bagrut_tests.content + bagrut_responses.answers, so
  // any client tampering with mc_score is overwritten on submit.
  app.post("/api/submit-bagrut", bagrutStudentLimiter, async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = authHeader.substring(7);
    const uid = await verifyToken(token);
    if (!uid) return res.status(401).json({ error: "Invalid token" });

    const userData = await getUserRoleAndClass(uid);
    if (!userData || userData.role !== "student") {
      return res.status(403).json({ error: "Only students can submit responses" });
    }

    if (!supabaseAdmin) return res.status(503).json({ error: "Database not configured" });

    const { test_id, answers } = req.body ?? {};
    if (typeof test_id !== "string") return res.status(400).json({ error: "test_id required" });
    if (typeof answers !== "object" || answers === null || Array.isArray(answers)) {
      return res.status(400).json({ error: "answers must be an object" });
    }

    // Load the canonical test (with answer key).  Service role bypasses RLS.
    const { data: testRow, error: testErr } = await supabaseAdmin
      .from("bagrut_tests")
      .select("id, class_id, content, published")
      .eq("id", test_id)
      .maybeSingle();
    if (testErr || !testRow) return res.status(404).json({ error: "Test not found" });
    if (!testRow.published || !testRow.class_id) {
      return res.status(403).json({ error: "Test is not published" });
    }

    // Verify student is enrolled in the test's class.
    const { data: classRow } = await supabaseAdmin
      .from("classes")
      .select("code")
      .eq("id", testRow.class_id)
      .maybeSingle();
    if (!classRow || classRow.code !== userData.classCode) {
      return res.status(403).json({ error: "You are not enrolled in this test's class" });
    }

    const test = testRow.content as BagrutTest;
    const sanitizedAnswers: Record<string, string> = {};
    let answerKeyCount = 0;
    for (const [k, v] of Object.entries(answers)) {
      if (typeof k !== "string" || typeof v !== "string") continue;
      if (!BAGRUT_ANSWER_KEY_RE.test(k)) continue;
      if (v.length > 5000) continue;
      sanitizedAnswers[k] = v;
      // Hard cap on number of answers — typical exam has <100 questions.
      // Stops a malicious client from upserting 100k keys.
      if (++answerKeyCount >= 200) break;
    }

    const mcMax = computeMcMax(test);
    const mcScore = scoreMcAnswers(test, sanitizedAnswers);

    // Upsert the response with submitted_at locked.
    const { error: upsertErr } = await supabaseAdmin
      .from("bagrut_responses")
      .upsert({
        test_id,
        student_uid: uid,
        answers: sanitizedAnswers,
        mc_score: mcScore,
        mc_max: mcMax,
        submitted_at: new Date().toISOString(),
      }, { onConflict: "test_id,student_uid" });

    if (upsertErr) {
      console.error("[bagrut] response upsert failed:", upsertErr);
      return res.status(500).json({ error: "Failed to save response" });
    }

    res.json({
      mc_score: mcScore,
      mc_max: mcMax,
      // Echo back the test with the answer key included so the student
      // sees correct answers on the review screen.
      review: test,
    });
  });

  // Public student fetch — returns the test with the answer key stripped.
  // Avoids any chance of the correct_answer leaking in DevTools before submit.
  app.get("/api/student-bagrut/:id", bagrutStudentLimiter, async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = authHeader.substring(7);
    const uid = await verifyToken(token);
    if (!uid) return res.status(401).json({ error: "Invalid token" });

    const userData = await getUserRoleAndClass(uid);
    if (!userData || userData.role !== "student") {
      return res.status(403).json({ error: "Students only" });
    }
    if (!supabaseAdmin) return res.status(503).json({ error: "Database not configured" });

    const { data: testRow } = await supabaseAdmin
      .from("bagrut_tests")
      .select("id, class_id, title, module, content, published")
      .eq("id", req.params.id)
      .maybeSingle();
    if (!testRow || !testRow.published || !testRow.class_id) {
      return res.status(404).json({ error: "Test not found" });
    }

    const { data: classRow } = await supabaseAdmin
      .from("classes")
      .select("code")
      .eq("id", testRow.class_id)
      .maybeSingle();
    if (!classRow || classRow.code !== userData.classCode) {
      return res.status(403).json({ error: "Not enrolled in this class" });
    }

    res.json({
      id: testRow.id,
      title: testRow.title,
      module: testRow.module,
      test: stripAnswerKey(testRow.content as BagrutTest),
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.SKIP_STATIC !== "true") {
    // Serve static files from dist/ (legacy mode — when Cloudflare Pages
    // is not yet configured). Set SKIP_STATIC=true once Pages handles static.
    const distPath = path.join(process.cwd(), "dist");

    // Prevent browsers from caching the service worker — must always fetch fresh
    app.get("/sw.js", (_req, res) => {
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Service-Worker-Allowed", "/");
      res.sendFile(path.join(distPath, "sw.js"));
    });

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

  // ─── Global error handler ────────────────────────────────────────────
  // Catch-all that runs when a route handler throws an uncaught exception
  // (or calls next(err)).  Without this, Express's built-in handler
  // returns the full stack trace as HTML — leaks file paths, library
  // versions, and DB error details to the client.
  //
  // Body shape mirrors our existing handler responses so client error-
  // surfacing code (toasts, retry banners) doesn't need a special case.
  // Stack always logged server-side for debugging; never sent to client.
  // The 4-arg signature is required by Express to register as an error
  // middleware; the unused `next` param is intentional.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // SECURITY: pass req.method and req.path as separate arguments
    // rather than interpolating into a template literal.  Node's
    // console.error treats the first argument as a printf-style
    // format string when it's a single string — an attacker requesting
    // e.g. `GET /%s%s%s` could inject format specifiers, corrupt log
    // structure, or extract context from subsequent arguments.
    // Passing each piece as a discrete argument bypasses format-string
    // parsing entirely; Node just stringifies and joins with spaces.
    // CodeQL ref: js/tainted-format-string.
    console.error("[unhandled]", req.method, req.path, "-", err?.stack || err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Internal server error" });
  });

  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
