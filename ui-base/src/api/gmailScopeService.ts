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
  tokenStatus?: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'INVALID';
  tokenEmail?: string;
  needsReAuth?: boolean;
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
   * Re-run unified Google sign-in (same as /get-started) to refresh Gmail + identity tokens.
   */
  requestGmailScopes(): void {
    window.location.href = `${API_BASE_URL}/auth/google`;
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
