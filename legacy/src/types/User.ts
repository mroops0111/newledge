// User types based on OpenAPI specification
export interface User {
  uuid: string;
  email: string;
  name: string;
  iconUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthCode {
  code: string;
  state?: string;
}

export interface OAuthAccessToken {
  accessToken: string;
  expiresIn: number;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface GoogleLoginResponse {
  authUrl: string;
}

export interface GoogleCallbackResponse {
  user: User;
  accessToken: string;
}
