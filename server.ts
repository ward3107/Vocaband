import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

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

  // Live Challenge State
  // { classCode: { studentUid: { name, score } } }
  const liveSessions: Record<string, Record<string, { name: string, score: number }>> = {};
  // Track which session each socket belongs to for cleanup
  const socketSessions: Record<string, { classCode: string, uid: string }> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-challenge", ({ classCode, name, uid }) => {
      if (
        typeof classCode !== "string" || classCode.length === 0 || classCode.length > 64 ||
        typeof name !== "string" || name.length === 0 || name.length > 100 ||
        typeof uid !== "string" || uid.length === 0 || uid.length > 128
      ) return;

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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
