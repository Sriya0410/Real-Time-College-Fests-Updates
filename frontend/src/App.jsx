import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";

// contexts
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}