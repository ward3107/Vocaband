import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Live Challenge State
  // { classCode: { studentUid: { name, score } } }
  const liveSessions: Record<string, Record<string, { name: string, score: number }>> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-challenge", ({ classCode, name, uid }) => {
      socket.join(classCode);
      if (!liveSessions[classCode]) {
        liveSessions[classCode] = {};
      }
      liveSessions[classCode][uid] = { name, score: 0 };
      io.to(classCode).emit("leaderboard-update", liveSessions[classCode]);
    });

    socket.on("update-score", ({ classCode, uid, score }) => {
      if (liveSessions[classCode] && liveSessions[classCode][uid]) {
        liveSessions[classCode][uid].score = score;
        io.to(classCode).emit("leaderboard-update", liveSessions[classCode]);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
