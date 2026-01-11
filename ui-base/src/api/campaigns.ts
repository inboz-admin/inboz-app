import { apiService } from './apiService';

export type Campaign = {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  contactListId: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';
  totalSteps: number;
  currentStep: number;
  trackingEnabled?: boolean;
  openTracking?: boolean;
  clickTracking?: boolean;
  unsubscribeTracking?: boolean;
  unsubscribeReplyEnabled?: boolean;
  unsubscribeCustomMessage?: string;
  autoAdvance?: boolean;
  complianceChecked?: boolean;
  complianceNotes?: string;
  completedAt?: string | null;
  sequenceSettings?: any;
  // analytics (readonly)
  totalRecipients: number;
  emailsSent: number;
  emailsDelivered: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsReplied: number;
  emailsBounced: number;
  emailsFailed: number;
  emailsCancelled: number;
  emailsComplained: number;
  emailsCompleted?: number; // Total completed (sent + bounced + failed) for progress display
  unsubscribes: number;
  // Calculated fields (not in database, added dynamically)
  progressPercentage?: number;
  totalExpectedEmails?: number;
  // creator info
  createdBy?: string;
  creator?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
};

export type CampaignStep = {
  id: string;
  timezone?: string;
  campaignId: string;
  name?: string | null;
  stepOrder: number;
  templateId?: string | null;
  triggerType: 'IMMEDIATE' | 'SCHEDULE';
  scheduleTime?: string | null; // ISO datetime string
  delayMinutes: number; // Delay in minutes between each email sent (minimum 1)
  replyToStepId?: string | null; // ID of previous step to reply to
  replyType?: 'OPENED' | 'CLICKED' | null; // Type of reply: OPENED (only opened, no clicks/replies), CLICKED (only clicked, no replies)
  // Analytics fields
  emailsSent: number;
  emailsDelivered: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsBounced: number;
  emailsFailed: number;
  emailsCancelled: number;
  emailsComplained: number;
  emailsReplied: number;
  emailsCompleted?: number; // Total completed (sent + bounced + failed) for progress display
  unsubscribes: number;
  // Calculated fields (not in database, added dynamically)
  emailsQueued?: number; // Number of emails queued for sending
  emailsScheduled?: number; // Number of emails scheduled
  totalExpected?: number; // Total expected emails for this step
  progressPercentage?: number; // Progress percentage for this step
};

export const CampaignsApi = {
  create(payload: Partial<Campaign>) {
    return apiService.post('/campaigns', payload).then(r => {
      // Check for error response
      if (r.statusCode && r.statusCode >= 400) {
        const errorMessage = r.message || 'Failed to create campaign';
        const error = new Error(errorMessage);
        (error as any).statusCode = r.statusCode;
        (error as any).error = r.error;
        (error as any).message = r.message;
        (error as any).response = { data: r, status: r.statusCode };
        throw error;
      }
      if (r.success === false && r.message) {
        const error = new Error(r.message);
        (error as any).statusCode = r.statusCode || 400;
        (error as any).error = r.error;
        (error as any).message = r.message;
        (error as any).response = { data: r };
        throw error;
      }
      return ((r.data as any)?.data ?? (r.data as any));
    });
  },
  list(params?: any) {
    return apiService.get('/campaigns', params);
  },
  get(id: string) {
    return apiService.get(`/campaigns/${id}`).then(r => ((r.data as any)?.data ?? (r.data as any)) as any);
  },
  update(id: string, payload: Partial<Campaign>) {
    return apiService.patch(`/campaigns/${id}`, payload).then(r => {
      // Check for error response
      if (r.statusCode && r.statusCode >= 400) {
        const errorMessage = r.message || 'Failed to update campaign';
        const error = new Error(errorMessage);
        (error as any).statusCode = r.statusCode;
        (error as any).error = r.error;
        (error as any).message = r.message;
        (error as any).response = { data: r, status: r.statusCode };
        throw error;
      }
      if (r.success === false && r.message) {
        const error = new Error(r.message);
        (error as any).statusCode = r.statusCode || 400;
        (error as any).error = r.error;
        (error as any).message = r.message;
        (error as any).response = { data: r };
        throw error;
      }
      return ((r.data as any)?.data ?? (r.data as any)) as any;
    });
  },
  remove(id: string) {
    return apiService.delete(`/campaigns/${id}`);
  },
  addStep(campaignId: string, payload: Partial<CampaignStep>) {
    return apiService.post(`/campaigns/${campaignId}/steps`, payload).then(r => {
      // Check for error response
      if (r.statusCode && r.statusCode >= 400) {
        const errorMessage = r.message || 'Failed to add step';
        const error = new Error(errorMessage);
        (error as any).statusCode = r.statusCode;
        (error as any).error = r.error;
        (error as any).response = { data: r, status: r.statusCode };
        throw error;
      }
      if (r.success === false && r.message) {
        const error = new Error(r.message);
        (error as any).statusCode = r.statusCode || 400;
        (error as any).error = r.error;
        (error as any).response = { data: r };
        throw error;
      }
      return ((r.data as any)?.data ?? r.data) as any;
    });
  },
  updateStep(campaignId: string, stepId: string, payload: Partial<CampaignStep>) {
    return apiService.patch(`/campaigns/${campaignId}/steps/${stepId}`, payload).then(r => {
      // Check for error response - NestJS returns error messages in the response
      if (r.statusCode && r.statusCode >= 400) {
        const errorMessage = r.message || 'Failed to update step';
        const error = new Error(errorMessage);
        (error as any).statusCode = r.statusCode;
        (error as any).error = r.error;
        (error as any).response = { data: { message: errorMessage }, status: r.statusCode };
        throw error;
      }
      if (r.success === false && r.message) {
        const error = new Error(r.message);
        (error as any).statusCode = r.statusCode || 400;
        (error as any).error = r.error;
        (error as any).response = { data: { message: r.message } };
        throw error;
      }
      // Also check if response has a message field indicating an error (NestJS format)
      if (r.message && (r.statusCode >= 400 || !r.success)) {
        const error = new Error(r.message);
        (error as any).statusCode = r.statusCode || 400;
        (error as any).error = r.error;
        (error as any).response = { data: { message: r.message }, status: r.statusCode || 400 };
        throw error;
      }
      return ((r.data as any)?.data ?? r.data) as any;
    });
  },
  deleteStep(campaignId: string, stepId: string) {
    return apiService.delete(`/campaigns/${campaignId}/steps/${stepId}`);
  },
  reorderSteps(campaignId: string, stepIdOrder: string[]) {
    return apiService.post(`/campaigns/${campaignId}/steps/reorder`, { stepIdOrder }).then(r => ((r.data as any)?.data ?? r.data) as any);
  },
  activate(campaignId: string, quotaMode?: 'auto-spread' | 'restrict') {
    // Build URL with query parameter if quotaMode is provided
    let url = `/campaigns/${campaignId}/activate`;
    if (quotaMode) {
      url += `?quotaMode=${quotaMode}`;
    }
    return apiService.patch(url, {}).then(r => {
      // Check for error response - NestJS returns statusCode and message on errors
      if (r.statusCode && r.statusCode >= 400) {
        throw new Error(r.message || 'Failed to activate campaign');
      }
      // Also check success field if present
      if (r.success === false && r.message) {
        throw new Error(r.message);
      }
      return ((r.data as any)?.data ?? r.data) as any;
    });
  },
  pause(campaignId: string) {
    return apiService.patch(`/campaigns/${campaignId}/pause`, {}).then(r => {
      // Check for error response
      if (r.statusCode && r.statusCode >= 400) {
        throw new Error(r.message || 'Failed to pause campaign');
      }
      if (r.success === false && r.message) {
        throw new Error(r.message);
      }
      return ((r.data as any)?.data ?? r.data) as any;
    });
  },
  resume(campaignId: string, quotaMode?: 'auto-spread' | 'restrict') {
    // Build URL with query parameter if quotaMode is provided
    let url = `/campaigns/${campaignId}/resume`;
    if (quotaMode) {
      url += `?quotaMode=${quotaMode}`;
    }
    return apiService.patch(url, {}).then(r => {
      // Check for error response
      if (r.statusCode && r.statusCode >= 400) {
        throw new Error(r.message || 'Failed to resume campaign');
      }
      if (r.success === false && r.message) {
        throw new Error(r.message);
      }
      return ((r.data as any)?.data ?? r.data) as any;
    });
  },
  getProgress(campaignId: string) {
    return apiService.get(`/campaigns/${campaignId}/progress`).then(r => ((r.data as any)?.data ?? r.data) as any);
  },
  getStepEmails(campaignId: string, stepId: string, eventType?: string, page?: number, limit?: number, status?: string) {
    const params: Record<string, string> = {};
    if (eventType) params.eventType = eventType;
    if (page) params.page = page.toString();
    if (limit) params.limit = limit.toString();
    if (status && status !== 'ALL') params.status = status;
    return apiService.get(`/campaigns/${campaignId}/steps/${stepId}/emails`, Object.keys(params).length > 0 ? params : undefined).then(r => {
      // Return the full response object to preserve pagination data (total, totalPages, etc.)
      // r.data contains { success: true, data: [...], total: 1152, totalPages: 29, ... }
      return (r.data as any) ?? r;
    });
  },
};


