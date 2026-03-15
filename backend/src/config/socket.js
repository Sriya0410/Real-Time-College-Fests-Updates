const { Server } = require("socket.io");

let io;

function initSocket(server) {
  const origins = [
    process.env.CLIENT_ORIGIN || "http://localhost:5173",
    process.env.FRONTEND_BASE_URL || "http://localhost:5173",
  ];

  io = new Server(server, {
    cors: {
      origin: origins,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id);

    socket.on("disconnect", (reason) => {
      console.log("⚠️ Socket disconnected:", socket.id, reason);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

module.exports = { initSocket, getIO };