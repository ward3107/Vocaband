import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { LeaderboardEntry, SOCKET_EVENTS, type JoinChallengePayload, type ObserveChallengePayload, type UpdateScorePayload } from "./src/core/types.js";
import { isValidClassCode, isValidName, isValidUid, isValidToken, createSocketRateLimiter } from "./src/server-utils.js";

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
  if (!supabaseAdmin) return null;
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
// On table-missing errors (code 42P01), returns a helpful message so the
// admin can see they need to run the 20260417_ai_sentence_builder.sql migration.
async function isPremiumTeacher(email: string): Promise<{ allowed: boolean; error?: string }> {
  if (!supabaseAdmin) return { allowed: false, error: "Supabase not configured" };
  try {
    const { data, error } = await supabaseAdmin
      .from("ai_allowlist")
      .select("email")
      .eq("email", email)
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
  if (!supabaseAdmin) return null;
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
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
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

    // Security headers via helmet
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://static.cloudflareinsights.com", "https://ajax.cloudflare.com", "https://challenges.cloudflare.com"],
          scriptSrcElem: ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com", "https://ajax.cloudflare.com", "https://challenges.cloudflare.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co", "https://cloudflareinsights.com", "https://api.mymemory.translated.net", ...allowedOrigins],
          frameSrc: ["https://accounts.google.com", "https://challenges.cloudflare.com"],
          workerSrc: ["'self'", "blob:"],
          mediaSrc: ["'self'", "https://*.supabase.co"],
        },
      },
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

  // CORS for /api/* routes (needed when SPA is served from Cloudflare Pages)
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.some(o => o === origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // Parse JSON request bodies (required for /api/translate endpoint)
  app.use(express.json({ limit: '50kb' }));

  // Multer for OCR image uploads (in-memory, no temp files)
  const ocrUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
      cb(null, allowed.includes(file.mimetype));
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

    socket.on(SOCKET_EVENTS.JOIN_CHALLENGE, async ({ classCode, name, uid }: JoinChallengePayload) => {
      if (!isValidClassCode(classCode) || !isValidName(name) || !isValidUid(uid)) return;

      // Pre-auth IP limiter: stops raw flooding before we hit Supabase
      if (!preAuthIpLimiter.checkLimit(clientIp)) return;

      // Identity check: payload uid must match the uid verified at connection time.
      // The connection middleware already verified the JWT and stored the uid in socket.data.
      if (uid !== socket.data.uid) return;

      // Post-auth per-user limiter: each authenticated user gets 5 joins/min
      if (!perUserLimiter.checkLimit(uid)) return;

      const userData = await getUserRoleAndClass(uid);
      if (!userData) return;

      // Only class members (students) or teachers who own the class can join.
      const canJoinAsStudent = userData.role === "student" && userData.classCode === classCode;
      const canJoinAsTeacher = userData.role === "teacher" && await isTeacherForClass(uid, classCode);
      if (!canJoinAsStudent && !canJoinAsTeacher) return;

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
      if (!isValidClassCode(classCode)) return;

      // Pre-auth IP limiter
      if (!preAuthIpLimiter.checkLimit(clientIp)) return;

      // Use the uid verified at connection time — no need to re-verify the token
      const verifiedUid = socket.data.uid as string;

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

  // Translation endpoint — server-side proxy to protect Google API key
  // Only authenticated teachers can access this
  app.post("/api/translate", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.substring(7);
    const uid = await verifyToken(token);
    if (!uid) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Verify user is a teacher
    const userData = await getUserRoleAndClass(uid);
    if (!userData || userData.role !== "teacher") {
      return res.status(403).json({ error: "Only teachers can translate" });
    }

    const { words } = req.body;
    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: "words array required" });
    }

    // Validate words
    const validWords = words.filter((w: string) => typeof w === "string" && w.trim().length > 0);
    if (validWords.length === 0) {
      return res.status(400).json({ error: "No valid words provided" });
    }

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      return res.status(503).json({
        error: "Google Translate API key not configured",
        message: "Please add GOOGLE_TRANSLATE_API_KEY to your .env file to enable translation."
      });
    }

    try {
      // Translate to Hebrew
      const [hebrewResponse, arabicResponse] = await Promise.all([
        fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: validWords,
            source: "en",
            target: "iw",
            format: "text",
          }),
        }),
        fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: validWords,
            source: "en",
            target: "ar",
            format: "text",
          }),
        }),
      ]);

      if (!hebrewResponse.ok || !arabicResponse.ok) {
        throw new Error("Translation API error");
      }

      const hebrewData = await hebrewResponse.json();
      const arabicData = await arabicResponse.json();

      res.json({
        hebrew: hebrewData.data?.translations?.map((t: any) => t.translatedText) || [],
        arabic: arabicData.data?.translations?.map((t: any) => t.translatedText) || [],
      });
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ error: "Translation failed" });
    }
  });

  // OCR endpoint — uses Tesseract.js to extract English words from uploaded images
  // Only authenticated teachers can access this
  app.post("/api/ocr", ocrRateLimiter, ocrUpload.single("file"), async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.substring(7);
    const authData = await verifyTokenWithEmail(token);
    if (!authData) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Verify user is a teacher
    const userData = await getUserRoleAndClass(authData.uid);
    if (!userData || userData.role !== "teacher") {
      console.warn(`[OCR] Access denied for uid=${authData.uid}, role=${userData?.role ?? "not found"}`);
      return res.status(403).json({ error: "Only teachers can use OCR" });
    }

    // Premium gate: OCR is limited to teachers in the ai_allowlist.
    // Same allowlist as AI sentence generation — one list, both features.
    const { allowed, error: gateErr } = await isPremiumTeacher(authData.email);
    if (gateErr) {
      console.error(`[OCR] allowlist check error for ${authData.email}: ${gateErr}`);
      return res.status(503).json({
        error: "Feature gate check failed",
        message: gateErr,
      });
    }
    if (!allowed) {
      console.log(`[OCR] access denied: ${authData.email} is not in ai_allowlist`);
      return res.status(403).json({
        error: "OCR is a premium feature",
        message: "Ask the admin to approve your account for OCR access.",
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded, or invalid file type." });
    }

    try {
      const Tesseract = await import("tesseract.js");
      // Pin langPath to the bundled @tesseract.js-data/eng package so Tesseract
      // reads eng.traineddata.gz from local disk instead of fetching from a CDN.
      // Without this, Tesseract.js v7 hard-codes a fetch to cdn.jsdelivr.net
      // which fails silently inside a Worker thread, bypassing the try/catch
      // here and leaving the endpoint to return {success: true, words: []}.
      const langPath = path.resolve(
        process.cwd(),
        "node_modules/@tesseract.js-data/eng/4.0.0"
      );
      const worker = await Tesseract.createWorker("eng", undefined, {
        langPath,
        cachePath: "/tmp/tesseract-cache",
        errorHandler: (e: unknown) => console.error("[OCR] Tesseract worker error:", e),
      });
      const { data } = await worker.recognize(req.file.buffer);
      await worker.terminate();
      const rawText = data.text || "";

      // Sanity check: empty rawText on a valid image usually means the worker
      // failed to initialize (traineddata missing, corrupted, or wrong OEM).
      // Fail loudly instead of silently returning {words: [], success: true}.
      if (rawText.trim().length === 0) {
        console.error("[OCR] Tesseract returned empty text — possible worker init failure");
        return res.status(500).json({
          error: "OCR engine returned no text",
          message: "Tesseract recognized zero characters. If this persists, check server logs for [OCR] entries.",
        });
      }

      // Extract English words, preserve original form, deduplicate
      const allWords = rawText.split(/[\s\n\r.,;:!?'"()\[\]{}<>\/\\|@#$%^&*+=~`_\-0-9]+/);
      const englishWordPattern = /^[a-zA-Z]{2,}$/;
      const seen = new Set<string>();
      const uniqueWords: string[] = [];

      for (const word of allWords) {
        if (englishWordPattern.test(word)) {
          const lower = word.toLowerCase();
          if (!seen.has(lower)) {
            seen.add(lower);
            uniqueWords.push(lower);
          }
        }
      }

      res.json({
        words: uniqueWords,
        raw_text: rawText,
        success: true,
      });
    } catch (error: any) {
      console.error("OCR error:", error?.message || error, error?.stack);
      res.status(500).json({
        error: "OCR processing failed",
        message: error?.message || "An unexpected error occurred during text recognition.",
        details: process.env.NODE_ENV !== "production" ? String(error) : undefined,
      });
    }
  });

  // AI feature gate — checks if the authenticated teacher has AI access.
  // Two layers: ANTHROPIC_API_KEY must be set AND teacher email in ai_allowlist.
  // Logs the exact reason for aiSentences=false so Render logs can diagnose
  // "why doesn't the AI button show up" without needing devtools access.
  app.get("/api/features", async (req, res) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log("[features] aiSentences=false: ANTHROPIC_API_KEY env var not set on the server");
      return res.json({ aiSentences: false });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[features] aiSentences=false: request missing Authorization: Bearer header");
      return res.json({ aiSentences: false });
    }
    const authData = await verifyTokenWithEmail(authHeader.substring(7));
    if (!authData) {
      console.log("[features] aiSentences=false: token verification failed (invalid or expired)");
      return res.json({ aiSentences: false });
    }
    const userData = await getUserRoleAndClass(authData.uid);
    if (!userData || userData.role !== "teacher") {
      console.log(`[features] aiSentences=false: user is not a teacher (role=${userData?.role ?? "none"}, email=${authData.email})`);
      return res.json({ aiSentences: false });
    }
    const { allowed, error } = await isPremiumTeacher(authData.email);
    if (error) {
      console.error(`[features] ai_allowlist check error for ${authData.email}: ${error}`);
    } else if (!allowed) {
      console.log(`[features] aiSentences=false: ${authData.email} is not in ai_allowlist (run: INSERT INTO public.ai_allowlist (email) VALUES ('${authData.email}');)`);
    } else {
      console.log(`[features] aiSentences=true for ${authData.email}`);
    }
    res.json({ aiSentences: allowed });
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
          system: `You generate English sentences for Israeli EFL students (grades 4-9).
Difficulty: ${DIFFICULTY_DESCRIPTIONS[diff]}
Each sentence MUST contain the target word exactly as given. Output one sentence per line, no numbering, no extra text.`,
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

  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
