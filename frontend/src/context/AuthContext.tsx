import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

import { api } from "../api/client";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    role: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", {
      email,
      password,
    });

    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setUser(data.user);

    return data.user as User;
  }, []);

  const register = useCallback(
    async (payload: {
      full_name: string;
      email: string;
      password: string;
      phone?: string;
      role: string;
    }) => {
      const requestPayload = {
        ...payload,
        phone: payload.phone?.trim() || undefined,
      };

      console.log("Register Payload:", requestPayload);

      const response = await api.post("/auth/register", requestPayload);

      console.log("Register Success:", response.data);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}