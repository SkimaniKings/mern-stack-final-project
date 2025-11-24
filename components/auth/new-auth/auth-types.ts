// Authentication types
export type AuthUser = {
  id: string;
  email: string;
  emailVerified?: boolean;
  lastLogin?: string;
  createdAt?: string;
};

export type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
};

export type LoginCredentials = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type RegisterCredentials = {
  email: string;
  password: string;
  agreeToTerms: boolean;
};

export type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};
