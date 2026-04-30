/* eslint-disable */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("crm_token") || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionMessage, setSessionMessage] = useState(null);

  // Load user from token on mount
  useEffect(() => {
    if (token) {
      authAPI.me()
        .then((user) => {
          setCurrentUser(user);
        })
        .catch(() => {
          // Token invalid or expired
          localStorage.removeItem("crm_token");
          setToken(null);
          setCurrentUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  // Listen for single-session invalidation from api.js
  useEffect(() => {
    const handleSessionInvalidated = () => {
      localStorage.removeItem("crm_token");
      setToken(null);
      setCurrentUser(null);
      setSessionMessage("You were logged out because your account was signed in on another device.");
    };
    window.addEventListener("session-invalidated", handleSessionInvalidated);
    return () => window.removeEventListener("session-invalidated", handleSessionInvalidated);
  }, []);

  // Background heartbeat — pings server every 30s to detect session invalidation even while idle
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      authAPI.verify().catch(() => {
        // verify() calls request() which fires "session-invalidated" event if needed
      });
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [token]);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const result = await authAPI.login(email, password);
      const { token: newToken, user } = result;
      localStorage.setItem("crm_token", newToken);
      setToken(newToken);
      setCurrentUser(user);
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("crm_token");
    setToken(null);
    setCurrentUser(null);
    setSessionMessage(null);
  }, []);

  const updateCurrentUser = useCallback((updates) => {
    setCurrentUser((prev) => prev ? { ...prev, ...updates } : null);
  }, []);

  const isAuthenticated = !!currentUser && !!token;

  const hasRole = useCallback((...roles) => {
    if (!currentUser) return false;
    return roles.includes(currentUser.role);
  }, [currentUser]);

  const isAdmin = hasRole("admin", "super_admin");
  const isSuperAdmin = hasRole("super_admin");
  const isTeamLeader = hasRole("team_leader", "admin", "super_admin");

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        loading,
        error,
        login,
        logout,
        isAuthenticated,
        hasRole,
        isAdmin,
        isSuperAdmin,
        isTeamLeader,
        updateCurrentUser,
        sessionMessage,
        clearSessionMessage: () => setSessionMessage(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
