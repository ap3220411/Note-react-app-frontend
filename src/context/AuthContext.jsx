import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";
import api from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  );
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const saveAuth = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken) {
      localStorage.setItem("auth_token", nextToken);
    } else {
      localStorage.removeItem("auth_token");
    }
  }, []);

  const logout = useCallback(() => {
    saveAuth(null, null);
    toast.success("Logged out");
  }, [saveAuth]);

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setInitializing(false);
      return;
    }

    try {
      const { data } = await api.get("/auth/profile");
      setUser(data?.data);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401) {
        logout();
        toast.error("Session expired. Please log in again.");
      } else {
        toast.error(
          error?.response?.data?.message || "Failed to fetch profile"
        );
      }
    } finally {
      setInitializing(false);
    }
  }, [logout, token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = useCallback(
    async (payload) => {
      setLoading(true);
      try {
        const { data } = await api.post("/auth/login", payload);
        const authData = data?.data || {};
        saveAuth(authData.token, authData.user);
        toast.success("Welcome back!");
        return { success: true };
      } catch (error) {
        const message =
          error?.response?.data?.message || "Unable to login. Please try again.";
        toast.error(message);
        return { success: false, message };
      } finally {
        setLoading(false);
      }
    },
    [saveAuth]
  );

  const signup = useCallback(
    async (payload) => {
      setLoading(true);
      try {
        const { data } = await api.post("/auth/signup", payload);
        const authData = data?.data || {};
        saveAuth(authData.token, authData.user);
        toast.success("Account created!");
        return { success: true };
      } catch (error) {
        const message =
          error?.response?.data?.message || "Unable to sign up right now.";
        toast.error(message);
        return { success: false, message };
      } finally {
        setLoading(false);
      }
    },
    [saveAuth]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      initializing,
      isAuthenticated: Boolean(token),
      login,
      signup,
      logout,
      refreshProfile: fetchProfile,
    }),
    [fetchProfile, initializing, loading, login, logout, signup, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};

