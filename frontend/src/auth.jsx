import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as api from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!api.getToken());

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    api.setUnauthorizedHandler(logout);
    if (!api.getToken()) return;
    api.fetchMe()
      .then(({ data }) => setUser(data.user))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  async function login(email, password) {
    const { data } = await api.login(email, password);
    api.setToken(data.token);
    setUser(data.user);
  }

  async function register(email, password, inviteCode) {
    const { data } = await api.register(email, password, inviteCode);
    api.setToken(data.token);
    setUser(data.user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
