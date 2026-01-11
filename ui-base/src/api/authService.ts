import { apiService } from "./apiService";
import type { BaseResponse } from "./types";
import { API_CONFIG } from "@/config/constants";

// API Configuration
const API_BASE_URL = API_CONFIG.baseUrl;

// Auth request/response types
export interface LoginRequest {
  email: string;
  password: string;
  userType: "employee" | "student";
}

export interface LoginResponse {
  access_token: {
    accessToken: string;
    refreshToken: string;
  };
  employee?: {
    id: number;
    email: string;
    name: string;
    role: string;
    centerId: number;
    status: string;
  };
  student?: {
    id: number;
    email: string;
    name: string;
    role: string;
    centerId: number;
    status: string;
  };
  userType: "employee" | "student";
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: string;
  type?: 'user' | 'employee';
  organizationId?: string;
  selectedOrganizationId?: string; // For employees to filter by selected org
  organization?: {
    id: string;
    name: string;
    slug: string;
    domain?: string;
  };
  accessToken?: string;
  refreshToken?: string;
  status?: string;
}

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */
export class AuthService {
  constructor() {
    // Set the base URL for the API service
    apiService.setBaseURL(API_BASE_URL);
  }

  /**
   * Login user with email, password, and user type
   */
  async login(credentials: LoginRequest): Promise<BaseResponse<LoginResponse>> {
    const response = await apiService.post<LoginResponse>(
      "/auth/login",
      credentials
    );

    // If login is successful, store the auth token
    if (response.success === true && response.data?.access_token?.accessToken) {
      apiService.setAuthToken(response.data.access_token.accessToken);
    }

    return response;
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(
    refreshToken: string
  ): Promise<BaseResponse<{ token: string }>> {
    const response = await apiService.post<{ token: string }>("/auth/refresh", {
      refreshToken,
    });

    // If refresh is successful, update the auth token
    if (response.success === true && response.data?.token) {
      apiService.setAuthToken(response.data.token);
    }

    return response;
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<BaseResponse<User>> {
    return await apiService.get<User>("/auth/me");
  }

  /**
   * Check if user is authenticated (has valid token)
   */
  isAuthenticated(): boolean {
    return apiService.isAuthenticated();
  }

  /**
   * Send forgot password request
   */
  async forgotPassword(data: {
    email: string;
    userType: "employee" | "student";
  }): Promise<BaseResponse<{ message: string; success: boolean }>> {
    return await apiService.post<{ message: string; success: boolean }>(
      "/auth/forgot-password",
      data
    );
  }

  /**
   * Initiate Google OAuth login (redirects to server)
   */
  initiateGoogleLogin(): void {
    // Simply redirect to the server OAuth endpoint
    // The server will handle the entire OAuth flow and redirect back with JWT tokens in cookies
    window.location.href = `${API_BASE_URL}/auth/google`;
  }

  /**
   * Check if user is authenticated (via cookies from OAuth)
   */
  async checkAuthStatus(): Promise<BaseResponse<{ user: any }>> {
    return await apiService.get<{ user: any }>("/auth/me");
  }

  /**
   * Logout user (clears server cookies and local tokens)
   */
  async logout(): Promise<BaseResponse<{ message: string }>> {
    try {
      const response = await apiService.post<{ message: string }>(
        "/auth/logout"
      );
      return response;
    } catch (error) {
      // Even if logout API fails, we should clear local tokens
      console.warn("Logout API call failed:", error);
      return {
        success: false,
        message: "Logout failed",
        statusCode: 500,
        module: "AUTH",
        error: {
          type: "TECHNICAL_ERROR",
          code: "LOGOUT_FAILED",
          details: error,
        },
        timestamp: new Date().toISOString(),
      };
    } finally {
      // Always clear the auth token from the service
      apiService.removeAuthToken();
    }
  }
}

// Export a singleton instance
export const authService = new AuthService();

// Export helper functions
export const AuthHelpers = {
  /**
   * Extract user data from login response
   */
  getUserFromResponse: (response: BaseResponse<LoginResponse>): User | null => {
    if (response.success === true && response.data) {
      const { employee, student, access_token, userType } = response.data;

      if (employee) {
        return {
          id: employee.id.toString(),
          email: employee.email,
          firstName: employee.name.split(" ")[0],
          lastName: employee.name.split(" ").slice(1).join(" "),
          role: employee.role,
          organizationId: employee.centerId?.toString(),
          accessToken: access_token?.accessToken,
          refreshToken: access_token?.refreshToken,
          status: employee.status,
        };
      }

      if (student) {
        return {
          id: student.id.toString(),
          email: student.email,
          firstName: student.name.split(" ")[0],
          lastName: student.name.split(" ").slice(1).join(" "),
          role: student.role,
          organizationId: student.centerId?.toString(),
          accessToken: access_token?.accessToken,
          refreshToken: access_token?.refreshToken,
          status: student.status,
        };
      }
    }
    return null;
  },

  /**
   * Extract token from login response
   */
  getTokenFromResponse: (
    response: BaseResponse<LoginResponse>
  ): string | null => {
    if (response.success === true && response.data?.access_token?.accessToken) {
      return response.data.access_token.accessToken;
    }
    return null;
  },

  /**
   * Check if login was successful
   */
  isLoginSuccess: (response: BaseResponse<LoginResponse>): boolean => {
    return (
      response.success === true && !!response.data?.access_token?.accessToken
    );
  },
};
