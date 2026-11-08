import { createContext, useContext, useEffect, useState } from "react";
import api, { tokens } from "./api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokens.access) { setLoading(false); return; }
    api.get("/auth/me/").then((r) => setUser(r.data)).catch(() => tokens.clear()).finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login/", { username, password });
    tokens.set(data);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    await api.post("/auth/register/", payload);
    return login(payload.username, payload.password);
  };

  const logout = () => { tokens.clear(); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isInstructor: !!user && user.role !== "student" }}>
      {children}
    </AuthContext.Provider>
  );
}
