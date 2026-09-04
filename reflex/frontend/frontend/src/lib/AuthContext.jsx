import { createContext, useContext, useEffect, useState } from "react";
import { api, saveSession, loadSession, clearSession } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession());

  useEffect(() => {
    if (session) saveSession(session);
  }, [session]);

  async function register({ name, phone, role, password }) {
    const result = await api.register({ name, phone, role, password });
    setSession(result);
    return result;
  }

  async function login({ phone, password }) {
    const result = await api.login({ phone, password });
    setSession(result);
    return result;
  }

  function logout() {
    clearSession();
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
