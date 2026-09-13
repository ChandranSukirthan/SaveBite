import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { User, UserRole, RegisterRequest } from "../types/auth";
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getStoredToken,
  getStoredUser,
  storeAuthData,
  isTokenExpired,
  getTokenRemainingTimeMs,
  type LoginRequest,
} from "../services/authService";

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<User>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const logout = useCallback(() => {
    clearLogoutTimer();
    apiLogout();
    setToken(null);
    setUser(null);
  }, [clearLogoutTimer]);

  const scheduleTokenExpiration = useCallback(
    (jwtToken: string) => {
      clearLogoutTimer();
      const remainingMs = getTokenRemainingTimeMs(jwtToken);

      if (remainingMs <= 0) {
        logout();
        window.dispatchEvent(new Event("savebite:auth-expired"));
        return;
      }

      // Schedule auto-logout precisely when the token expires
      logoutTimerRef.current = setTimeout(() => {
        logout();
        window.dispatchEvent(new Event("savebite:auth-expired"));
      }, remainingMs);
    },
    [clearLogoutTimer, logout]
  );

  // Restore session from storage on mount & check expiration
  useEffect(() => {
    try {
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();

      if (storedToken && storedUser) {
        if (isTokenExpired(storedToken)) {
          logout();
          window.dispatchEvent(new Event("savebite:auth-expired"));
        } else {
          setToken(storedToken);
          setUser(storedUser);
          scheduleTokenExpiration(storedToken);
        }
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }

    // Tab visibility check: immediately logout if token expired while tab was hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const currentToken = getStoredToken();
        if (currentToken && isTokenExpired(currentToken)) {
          logout();
          window.dispatchEvent(new Event("savebite:auth-expired"));
        }
      }
    };

    // Listen for 401 expiration event
    const handleAuthExpired = () => {
      clearLogoutTimer();
      setToken(null);
      setUser(null);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("savebite:auth-expired", handleAuthExpired);

    return () => {
      clearLogoutTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("savebite:auth-expired", handleAuthExpired);
    };
  }, [logout, scheduleTokenExpiration, clearLogoutTimer]);

  const login = useCallback(
    async (credentials: LoginRequest): Promise<User> => {
      setLoading(true);
      try {
        const response = await apiLogin(credentials);
        storeAuthData(response.token, response.user);
        setToken(response.token);
        setUser(response.user);
        scheduleTokenExpiration(response.token);
        return response.user;
      } finally {
        setLoading(false);
      }
    },
    [scheduleTokenExpiration]
  );

  const register = useCallback(
    async (payload: RegisterRequest): Promise<void> => {
      setLoading(true);
      try {
        await apiRegister(payload);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const hasRole = useCallback(
    (role: UserRole): boolean => {
      return user?.role === role;
    },
    [user]
  );

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!token && !!user,
      login,
      register,
      logout,
      hasRole,
    }),
    [user, token, loading, login, register, logout, hasRole]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
