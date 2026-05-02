import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("clashofcode_user");
    return stored && stored !== "undefined" ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem("clashofcode_token");
    return stored && stored !== "undefined" ? stored : "";
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [token]);

  // Clean up corrupted localStorage
  useEffect(() => {
    const userStored = localStorage.getItem("clashofcode_user");
    const tokenStored = localStorage.getItem("clashofcode_token");
    if (userStored === "undefined") {
      localStorage.removeItem("clashofcode_user");
    }
    if (tokenStored === "undefined") {
      localStorage.removeItem("clashofcode_token");
    }
  }, []);

  const setAuthState = (authData) => {
    const { user: authUser, access_token } = authData;
    localStorage.setItem("clashofcode_token", access_token);
    localStorage.setItem("clashofcode_user", JSON.stringify(authUser));
    setToken(access_token);
    setUser(authUser);
  };

  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await api.post("/auth/login", credentials);
      setAuthState(response.data);
      navigate("/dashboard", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const register = async (values) => {
    setLoading(true);
    try {
      const response = await api.post("/auth/register", values);
      setAuthState(response.data);
      navigate("/dashboard", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("clashofcode_token");
    localStorage.removeItem("clashofcode_user");
    setToken("");
    setUser(null);
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
