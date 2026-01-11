import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { UserContextService } from 'src/common/services/user-context.service';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../users/entities/user.entity';

@Controller()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly userContextService: UserContextService,
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  /**
   * Ensure organizationId is set in query
   * If not provided from UI, extract from current user's JWT or user model
   * For employees, organizationId should be provided via query params (from UI selector)
   */
  private async ensureOrganizationId(query: AnalyticsQueryDto): Promise<string> {
    // If organizationId is provided, use it
    if (query.organizationId) {
      return query.organizationId;
    }

    const currentUser = this.userContextService.getCurrentUser();
    const isEmployee = currentUser?.type === 'employee';

    // For employees, organizationId must be provided via query params (from organization selector)
    // They don't have organizationId in JWT, so we require it in the query
    if (isEmployee) {
      throw new BadRequestException('Organization ID is required. Please select an organization from the organization selector.');
    }

    // For regular users, try to get from JWT payload
    if (currentUser?.organizationId) {
      query.organizationId = currentUser.organizationId;
      return currentUser.organizationId;
    }

    // If not in JWT, fetch from user model
    const userId = currentUser?.sub;
    if (userId) {
      const user = await this.userModel.findByPk(userId, {
        attributes: ['id', 'organizationId'],
      });
      if (user?.organizationId) {
        query.organizationId = user.organizationId;
        return user.organizationId;
      }
    }

    throw new BadRequestException('Organization ID is required. Please provide organizationId in query or ensure your account is associated with an organization.');
  }

  @Get('kpis')
  async getKpiStats(@Query() query: AnalyticsQueryDto) {
    // Platform view doesn't require organizationId
    if (!query.platformView) {
      await this.ensureOrganizationId(query);
    }
    return this.analyticsService.getKpiStats(query);
  }

  @Get('user-wise')
  async getUserWiseAnalytics(@Query() query: AnalyticsQueryDto) {
    await this.ensureOrganizationId(query);
    return this.analyticsService.getUserWiseAnalytics(query);
  }

  @Get('campaigns')
  async getCampaignWiseAnalytics(@Query() query: AnalyticsQueryDto) {
    await this.ensureOrganizationId(query);
    return this.analyticsService.getCampaignWiseAnalytics(query);
  }

  @Get('email-status')
  async getEmailStatusBreakdown(@Query() query: AnalyticsQueryDto) {
    await this.ensureOrganizationId(query);
    return this.analyticsService.getEmailStatusBreakdown(query);
  }

  @Get('campaign-status')
  async getCampaignStatusDistribution(@Query() query: AnalyticsQueryDto) {
    await this.ensureOrganizationId(query);
    return this.analyticsService.getCampaignStatusDistribution(query);
  }

  @Get('users')
  async getUsersWithAnalytics(@Query() query: AnalyticsQueryDto) {
    await this.ensureOrganizationId(query);
    return this.analyticsService.getUsersWithAnalytics(query);
  }

  @Get('user-emails')
  async getUserEmails(@Query() query: {
    userId: string;
    organizationId?: string;
    eventType?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const dto: AnalyticsQueryDto = {
      organizationId: query.organizationId,
    };
    const orgId = await this.ensureOrganizationId(dto);
    return this.analyticsService.getUserEmails({
      ...query,
      organizationId: orgId,
    });
  }

  @Get('organization-breakdown')
  async getOrganizationBreakdown(@Query() query: AnalyticsQueryDto) {
    // Only SUPERADMIN employees can access platform analytics
    const currentUser = this.userContextService.getCurrentUser();
    const isSuperAdmin = currentUser?.type === 'employee' && currentUser?.role === 'SUPERADMIN';
    
    if (!isSuperAdmin) {
      throw new BadRequestException('Organization breakdown is only available to SUPERADMIN employees');
    }

    return this.analyticsService.getOrganizationBreakdown(query);
  }
}

