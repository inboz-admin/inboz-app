import { apiService } from "./apiService";
import type { BaseResponse } from "./types";
import { API_CONFIG } from "@/config/constants";

// API Configuration
const API_BASE_URL = API_CONFIG.baseUrl;

// Scope response types
export interface UserScopes {
  scopes: string[];
  hasEmail: boolean;
  hasProfile: boolean;
  hasGmailReadonly: boolean;
  hasGmailSend: boolean;
  hasAllGmailScopes: boolean;
}

/**
 * Gmail Scope Service
 * Handles Gmail OAuth scope checking and authorization
 */
export class GmailScopeService {
  constructor() {
    apiService.setBaseURL(API_BASE_URL);
  }

  /**
   * Check if user has required Gmail scopes
   */
  async checkGmailScopes(): Promise<BaseResponse<UserScopes>> {
    return apiService.get<UserScopes>("/auth/scopes");
  }

  /**
   * Request Gmail scopes by redirecting to Google OAuth
   */
  requestGmailScopes(): void {
    // Simply redirect to the server endpoint which will handle OAuth flow
    const authUrl = `${API_BASE_URL}/auth/google/gmail`;
    window.location.href = authUrl;
  }

  /**
   * Revoke all OAuth tokens
   */
  async revokeTokens(): Promise<BaseResponse<{ message: string }>> {
    return apiService.post<{ message: string }>("/auth/revoke", {});
  }
}

// Export singleton instance
export const gmailScopeService = new GmailScopeService();
