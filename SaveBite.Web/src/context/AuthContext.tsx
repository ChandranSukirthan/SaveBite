import {
  createContext,
  useContext,
  useEffect,
  useState,
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

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    } catch {
      apiLogout();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }

    // Listen for 401 expiration event
    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener("savebite:auth-expired", handleAuthExpired);
    return () => {
      window.removeEventListener("savebite:auth-expired", handleAuthExpired);
    };
  }, []);

  const login = async (credentials: LoginRequest): Promise<User> => {
    setLoading(true);
    try {
      const response = await apiLogin(credentials);
      storeAuthData(response.token, response.user);
      setToken(response.token);
      setUser(response.user);
      return response.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload: RegisterRequest): Promise<void> => {
    setLoading(true);
    try {
      await apiRegister(payload);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiLogout();
    setToken(null);
    setUser(null);
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        hasRole,
      }}
    >
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
