import type { BaseResponse, ModuleNames, ErrorTypes } from "./types";
import { API_CONFIG } from "@/config/constants";
import { toast } from "sonner";
import { getAppStoreState } from "@/stores/appStore";

/**
 * Simple and reusable API service for handling HTTP requests
 */
export class ApiService {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(
    baseURL: string = API_CONFIG.baseUrl,
    defaultHeaders: Record<string, string> = {}
  ) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...defaultHeaders,
    };
    this.timeout = API_CONFIG.timeout;

    // Automatically load and set access token from sessionStorage on initialization
    this.initializeAuthToken();
  }

  /**
   * Initialize auth token from sessionStorage
   */
  private initializeAuthToken(): void {
    const token = this.getStoredToken();
    if (token) {
      this.setAuthToken(token);
    }
  }

  /**
   * Get stored access token from sessionStorage
   */
  private getStoredToken(): string | null {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("accessToken");
    }
    return null;
  }

  /**
   * Store access token in sessionStorage
   */
  private storeToken(token: string): void {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("accessToken", token);
    }
  }

  /**
   * Remove access token from sessionStorage
   */
  private removeStoredToken(): void {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      sessionStorage.removeItem("refresh_token");
    }
  }

  /**
   * Set base URL
   */
  setBaseURL(url: string): void {
    this.baseURL = url;
  }

  /**
   * Set authorization token and store it in sessionStorage
   */
  setAuthToken(token: string): void {
    this.defaultHeaders["Authorization"] = `Bearer ${token}`;
    this.storeToken(token);
  }

  /**
   * Remove authorization token and clear from sessionStorage
   */
  removeAuthToken(): void {
    delete this.defaultHeaders["Authorization"];
    this.removeStoredToken();
  }

  /**
   * Check if user is authenticated via cookies (for OAuth flow)
   */
  isAuthenticatedViaCookies(): boolean {
    // For OAuth flow, we rely on HTTP-only cookies set by the server
    // This method checks if we can make authenticated requests
    return true; // The server will validate the cookies
  }

  /**
   * Set custom header
   */
  setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  /**
   * Remove custom header
   */
  removeHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  /**
   * Refresh token from sessionStorage (useful after login/logout)
   */
  refreshAuthToken(): void {
    const token = this.getStoredToken();
    if (token) {
      this.defaultHeaders["Authorization"] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders["Authorization"];
    }
  }

  /**
   * Check if user is authenticated (has valid token)
   */
  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }

  /**
   * Generic request method
   */
  private async request<T = unknown>(
    method: string,
    url: string,
    data?: unknown,
    customHeaders?: Record<string, string>,
    customTimeout?: number
  ): Promise<BaseResponse<T>> {
    try {
      const fullUrl = url.startsWith("http")
        ? url
        : `${this.baseURL.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;

      // Ensure we have the latest token from sessionStorage for each request
      const storedToken = this.getStoredToken();
      if (storedToken && !this.defaultHeaders["Authorization"]) {
        this.defaultHeaders["Authorization"] = `Bearer ${storedToken}`;
      }

      const timeout = customTimeout ?? this.timeout;

      const requestOptions: RequestInit = {
        method: method.toUpperCase(),
        headers: {
          ...this.defaultHeaders,
          ...customHeaders,
        },
        credentials: "include", // Include cookies for OAuth authentication
        signal: AbortSignal.timeout(timeout),
      };

      // Add body for POST, PUT, PATCH, DELETE requests
      if (
        ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase()) &&
        data
      ) {
        requestOptions.body = JSON.stringify(data);
      }

      const response = await fetch(fullUrl, requestOptions);
      const responseData = (await response.json()) as BaseResponse<T>;

      // Handle specific HTTP status codes for better error handling
      if (!response.ok) {
        // For 409 conflicts and 401 unauthorized, don't show generic error toast here
        // Let individual components handle specific error messages
        if (response.status === 409) {
          // Conflict errors should be handled by the calling component
          // to show specific conflict messages (e.g., "Email already exists")
        } else if (response.status === 401) {
          // Unauthorized errors should be handled by the calling component
          // to show specific error messages (e.g., "Account inactive", "Invalid credentials")
        } else if (response.status >= 500) {
          // Server errors - show generic error
          toast.error("Server error occurred. Please try again later.");
        } else if (response.status === 403) {
          // Forbidden
          toast.error("You don't have permission to perform this action.");
        }
      }

      return responseData;
    } catch (error: unknown) {
      // Check if error is a timeout
      const isTimeout = error instanceof Error && 
        (error.name === 'TimeoutError' || 
         error.message.includes('timeout') || 
         error.message.includes('aborted'));
      
      // Show network error toast with specific message for timeouts
      const errorMessage = isTimeout
        ? "Request timed out. The operation may have completed in the background. Please refresh to verify."
        : (error instanceof Error ? error.message : "Network error occurred");
      
      // Don't show toast for timeout errors - let the component handle it
      // as the operation might have succeeded
      if (!isTimeout) {
        toast.error(errorMessage);
      }

      // Create a basic error response if the request fails
      return {
        success: false,
        statusCode: 500,
        message: errorMessage,
        module: "APP" as ModuleNames,
        error: {
          type: "TECHNICAL_ERROR" as ErrorTypes,
          code: "NETWORK_ERROR",
          details: error,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(
    url: string,
    params?: Record<string, string | number | boolean | string[]>,
    headers?: Record<string, string>
  ): Promise<BaseResponse<T>> {
    // Automatically add organizationId query param for employees if selected
    // Skip for /organizations endpoint (we want ALL organizations for the selector)
    let finalParams = params || {};
    const storeState = getAppStoreState();
    const isOrganizationsEndpoint = url.includes('/organizations') && !url.match(/\/organizations\/[^/]+/);
    
    if (
      storeState.user?.type === "employee" &&
      storeState.selectedOrganizationId &&
      !isOrganizationsEndpoint // Don't add organizationId when fetching organizations list
    ) {
      // Only add organizationId if not already provided in params
      if (!finalParams.organizationId) {
        finalParams = {
          ...finalParams,
          organizationId: storeState.selectedOrganizationId,
        };
      }
    }

    let finalUrl = url;
    if (finalParams && Object.keys(finalParams).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(finalParams).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // For arrays, add each value as a separate parameter
          value.forEach((item) => searchParams.append(key, String(item)));
        } else {
          searchParams.append(key, String(value));
        }
      });
      // Check if URL already has query parameters
      const separator = url.includes('?') ? '&' : '?';
      finalUrl = `${url}${separator}${searchParams}`;
    }
    return this.request<T>("GET", finalUrl, undefined, headers, undefined);
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<BaseResponse<T>> {
    // Increase timeout for organization creation (can take longer due to subscription queue)
    const customTimeout = url.includes('/organizations') && !url.match(/\/organizations\/[^/]+/) 
      ? 30000 // 30 seconds for organization creation
      : this.timeout;
    
    return this.request<T>("POST", url, data, headers, customTimeout);
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<BaseResponse<T>> {
    return this.request<T>("PUT", url, data, headers, undefined);
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<BaseResponse<T>> {
    return this.request<T>("PATCH", url, data, headers, undefined);
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<BaseResponse<T>> {
    return this.request<T>("DELETE", url, data, headers, undefined);
  }
}

// Default API service instance
export const apiService = new ApiService();
