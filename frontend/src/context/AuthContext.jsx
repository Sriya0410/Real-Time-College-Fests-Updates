import { createContext, useContext, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

function safeParse(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => safeParse("user"));
  const [adminUser, setAdminUser] = useState(() => safeParse("admin_user"));

  const registerStudent = async (payload) => {
    const res = await api.post("/auth/student/register", payload);
    return res.data;
  };

  const loginStudent = async (email, password) => {
    const res = await api.post("/auth/student/login", { email, password });

    const token = res.data?.token ?? res.data?.data?.token;
    const u = res.data?.user ?? res.data?.data?.user;

    if (!token || !u) throw new Error("Invalid login response");

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);

    return u;
  };

  const loginAdmin = async (email, password) => {
    const res = await api.post("/auth/admin/login", { email, password });

    const token = res.data?.token ?? res.data?.data?.token;
    const u = res.data?.user ?? res.data?.data?.user;

    if (!token || !u) throw new Error("Invalid admin login response");

    localStorage.setItem("admin_token", token);
    localStorage.setItem("admin_user", JSON.stringify(u));
    setAdminUser(u);

    return { token, user: u };
  };

  const forgotStudentPassword = async (email) => {
    const res = await api.post("/auth/student/forgot-password", { email });
    return res.data;
  };

  const resetStudentPassword = async ({ token, password, confirmPassword }) => {
    const res = await api.post("/auth/student/reset-password", {
      token,
      password,
      confirmPassword,
    });
    return res.data;
  };

  const forgotAdminPassword = async (email) => {
    const res = await api.post("/auth/admin/forgot-password", { email });
    return res.data;
  };

  const resetAdminPassword = async ({ token, password, confirmPassword }) => {
    const res = await api.post("/auth/admin/reset-password", {
      token,
      password,
      confirmPassword,
    });
    return res.data;
  };

  const logoutStudent = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const logoutAdmin = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setAdminUser(null);
  };

  const logout = () => {
    logoutStudent();
    logoutAdmin();
  };

  const value = useMemo(
    () => ({
      user,
      adminUser,
      registerStudent,
      loginStudent,
      loginAdmin,
      forgotStudentPassword,
      resetStudentPassword,
      forgotAdminPassword,
      resetAdminPassword,
      logoutStudent,
      logoutAdmin,
      logout,
    }),
    [user, adminUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}