import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext({ socket: null, connected: false });

export function useSocket() {
  return useContext(SocketContext);
}

function getSocketURL() {
  // example: VITE_API_URL=http://localhost:5000/api
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  // remove trailing /api
  return apiUrl.replace(/\/api\/?$/, "");
}

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  const SOCKET_URL = getSocketURL();

  useEffect(() => {
    // prevent double init (React strict mode)
    if (socketRef.current) return;

    const s = io(SOCKET_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });

    socketRef.current = s;

    const onConnect = () => {
      setConnected(true);
      console.log("✅ Socket connected:", s.id);
    };

    const onDisconnect = (reason) => {
      setConnected(false);
      console.log("⚠️ Socket disconnected:", reason);
    };

    const onConnectError = (e) => {
      console.log("❌ Socket connect_error:", e?.message || e);
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onConnectError);
      s.disconnect();
      socketRef.current = null;
    };
  }, [SOCKET_URL]);

  const value = useMemo(() => {
    return { socket: socketRef.current, connected };
  }, [connected]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}