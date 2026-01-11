import { apiService } from "./apiService";
import type { BaseResponse } from "./types";

export interface SelectionState {
  sessionId: string;
  totalSelected: number;
  baseCount: number;
  addedCount: number;
  removedCount: number;
  currentSelection: string[];
}

export interface CreateSessionResponse {
  sessionId: string;
}

export interface UpdateSelectionRequest {
  contactIds: string[];
  operation: "add" | "remove";
}

export interface ApplyResult {
  addedCount: number;
  removedCount: number;
  finalCount: number;
}

class SelectionSessionService {
  private baseUrl = "/contacts/selection";

  /**
   * Create a new selection session
   */
  async createSession(
    listId: string
  ): Promise<BaseResponse<CreateSessionResponse>> {
    return apiService.post(`${this.baseUrl}/session`, { listId });
  }

  /**
   * Get current selection state
   */
  async getSelectionState(
    sessionId: string
  ): Promise<BaseResponse<SelectionState>> {
    return apiService.get(`${this.baseUrl}/${sessionId}/state`);
  }

  /**
   * Update selection (add or remove contacts)
   */
  async updateSelection(
    sessionId: string,
    data: UpdateSelectionRequest
  ): Promise<BaseResponse<SelectionState>> {
    return apiService.patch(`${this.baseUrl}/${sessionId}`, data);
  }

  /**
   * Apply selection changes to the contact list
   */
  async applySelection(sessionId: string): Promise<BaseResponse<ApplyResult>> {
    return apiService.post(`${this.baseUrl}/${sessionId}/apply`);
  }

  async resetSelectionToOriginal(
    sessionId: string
  ): Promise<BaseResponse<SelectionState>> {
    return apiService.post(`${this.baseUrl}/${sessionId}/reset`);
  }
}

export const selectionSessionService = new SelectionSessionService();
