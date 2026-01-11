export interface ICampaignAnalyticsService {
  getCampaignProgress(campaignId: string): Promise<any>;
  getStepEmails(
    campaignId: string,
    stepId: string,
    eventType?: string,
    page?: number,
    limit?: number,
    status?: string,
  ): Promise<any>;
}

