// Application configuration constants
export const APP_CONFIG = {
  name: "UI Base",
  version: "1.0.0",
  description: "Modern React UI Component Library",
} as const;

export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || "https://inboz.io/api/v1",
  timeout: 10000,
} as const;

export const THEME_CONFIG = {
  defaultTheme: "light",
  themes: ["light", "dark", "system"] as const,
} as const;

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const;

export const GOOGLE_OAUTH_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
  redirectUri:
    import.meta.env.VITE_GOOGLE_REDIRECT_URI ||
    window.location.origin + "/get-started",
  scope: "openid email profile",
} as const;
