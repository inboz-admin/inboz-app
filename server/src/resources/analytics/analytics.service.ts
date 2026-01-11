import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { User, UserStatus } from '../users/entities/user.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { EmailTemplate } from '../email-templates/entities/email-template.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CampaignStep } from '../campaigns/entities/campaign-step.entity';
import { EmailMessage, EmailMessageStatus } from '../campaigns/entities/email-message.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { ContactList } from '../contact-lists/entities/contact-list.entity';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { UserContextService } from 'src/common/services/user-context.service';
import { UserRole } from 'src/common/enums/roles.enum';
import { SUBSCRIPTION_PLAN_IDS } from '../subscriptions/constants/subscription-plans.constants';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
    @InjectModel(Contact)
    private readonly contactModel: typeof Contact,
    @InjectModel(EmailTemplate)
    private readonly emailTemplateModel: typeof EmailTemplate,
    @InjectModel(Campaign)
    private readonly campaignModel: typeof Campaign,
    @InjectModel(CampaignStep)
    private readonly campaignStepModel: typeof CampaignStep,
    @InjectModel(EmailMessage)
    private readonly emailMessageModel: typeof EmailMessage,
    @InjectModel(Organization)
    private readonly organizationModel: typeof Organization,
    @InjectModel(Subscription)
    private readonly subscriptionModel: typeof Subscription,
    @InjectModel(SubscriptionPlan)
    private readonly subscriptionPlanModel: typeof SubscriptionPlan,
    @InjectModel(ContactList)
    private readonly contactListModel: typeof ContactList,
    private readonly userContextService: UserContextService,
  ) {}

  /**
   * Get KPI statistics
   * Returns aggregated KPIs: total users (active/inactive), contacts, templates, emails sent, engagement metrics
   */
  async getKpiStats(query: AnalyticsQueryDto) {
    const { startDate, endDate, organizationId, userId: filterUserId, platformView } = query;
    
    const currentUser = this.userContextService.getCurrentUser();
    const currentUserId = currentUser?.sub;
    const userRole = currentUser?.role as UserRole;
    const isEmployee = currentUser?.type === 'employee';
    const isSuperAdmin = isEmployee && userRole === UserRole.SUPERADMIN;

    // Platform view: only SUPERADMIN employees can access
    if (platformView) {
      if (!isSuperAdmin) {
        throw new BadRequestException('Platform view is only available to SUPERADMIN employees');
      }
      return this.getPlatformKpiStats(query);
    }

    // Regular organization view
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    // For employees, treat them as admins (can see all data in selected organization)
    // For regular users, check if they are ADMIN role
    const isAdmin = isEmployee || userRole === UserRole.ADMIN;
    
    // Use filterUserId if provided, otherwise use currentUserId (but not for employees unless filtering)
    // When filterUserId is provided, treat it as if the user is filtering (like non-admin behavior)
    // For employees without filterUserId, don't use currentUserId (they're not filtering by their own user record)
    const userId = filterUserId || (!isEmployee ? currentUserId : undefined);
    const shouldFilterByUser = !!filterUserId || !isAdmin;
    
    const dateFilter = this.buildDateFilter(startDate, endDate, userId, !shouldFilterByUser, organizationId);

    try {
      // For regular users or when filtering by user, show only that user's stats
      // For admins (without filter), show all users in organization
      let totalUsers = 0;
      let activeUsers = 0;
      let inactiveUsers = 0;

      if (!shouldFilterByUser && !filterUserId) {
        // Admin: show all users in organization (only when no filter is applied)
        [totalUsers, activeUsers, inactiveUsers] = await Promise.all([
          this.userModel.count({
            where: {
              ...dateFilter.userFilter,
              organizationId,
            },
          }),
          this.userModel.count({
            where: {
              ...dateFilter.userFilter,
              organizationId,
              status: UserStatus.ACTIVE,
            },
          }),
          this.userModel.count({
            where: {
              ...dateFilter.userFilter,
              organizationId,
              status: { [Op.ne]: UserStatus.ACTIVE },
            },
          }),
        ]);
      } else if (userId) {
        // Filtered by specific user: show only that user
        const user = await this.userModel.findOne({
          where: { 
            id: userId,
            organizationId, // Ensure user belongs to the organization
          },
        });
        if (user) {
          totalUsers = 1;
          activeUsers = user.status === UserStatus.ACTIVE ? 1 : 0;
          inactiveUsers = user.status === UserStatus.ACTIVE ? 0 : 1;
        }
      }

      // Get total contacts - filter by organizationId
      const totalContacts = await this.contactModel.count({
        where: {
          ...dateFilter.contactFilter,
          organizationId,
        },
      });

      // Get total templates - filter by organizationId (and userId if not admin)
      const totalTemplates = await this.emailTemplateModel.count({
        where: {
          ...dateFilter.templateFilter,
          organizationId,
        },
      });

      // Get email statistics - filter by organizationId and user's campaigns if filtering by user
      let emailFilterWhere: any = { ...dateFilter.emailFilter, organizationId };
      const campaignFilter = dateFilter.campaignFilter;

      // When filtering by user, filter emails by their campaigns
      if (shouldFilterByUser && userId) {
        const userCampaigns = await this.campaignModel.findAll({
          where: {
            ...campaignFilter,
            organizationId, // Filter by organization
            createdBy: userId, // Filter by user
          },
          attributes: ['id'],
          raw: true,
        });
        const campaignIds = userCampaigns.map((c: any) => c.id);
        
        if (campaignIds.length > 0) {
          emailFilterWhere = {
            ...dateFilter.emailFilter,
            organizationId, // Direct organization filter
            campaignId: { [Op.in]: campaignIds },
          };
        } else {
          // User has no campaigns, so no emails
          emailFilterWhere = {
            ...dateFilter.emailFilter,
            organizationId, // Direct organization filter
            campaignId: { [Op.eq]: null }, // This will return 0 results
          };
        }
      }

      const [
        totalEmailsDelivered,
        totalEmailsOpened,
        totalEmailsClicked,
        totalEmailsFailed,
        totalCampaigns,
        activeCampaigns,
        campaignsForBounceRate,
      ] = await Promise.all([
        // Total emails delivered
        this.emailMessageModel.count({
          where: {
            ...emailFilterWhere,
            status: EmailMessageStatus.DELIVERED,
          },
        }),
        // Total emails opened (has openedAt date)
        this.emailMessageModel.count({
          where: {
            ...emailFilterWhere,
            openedAt: { [Op.ne]: null },
          },
        }),
        // Total emails clicked (has clickedAt date)
        this.emailMessageModel.count({
          where: {
            ...emailFilterWhere,
            clickedAt: { [Op.ne]: null },
          },
        }),
        // Total emails failed
        this.emailMessageModel.count({
          where: {
            ...emailFilterWhere,
            status: EmailMessageStatus.FAILED,
          },
        }),
        // Total campaigns - filter by organizationId (and userId if filtering)
        this.campaignModel.count({
          where: {
            ...campaignFilter,
            organizationId,
            ...(shouldFilterByUser && userId ? { createdBy: userId } : {}),
          },
        }),
        // Active campaigns - filter by organizationId (and userId if filtering)
        this.campaignModel.count({
          where: {
            ...campaignFilter,
            organizationId,
            status: 'ACTIVE',
            ...(shouldFilterByUser && userId ? { createdBy: userId } : {}),
          },
        }),
        // Get campaigns to sum emailsSent and emailsBounced for bounce rate calculation
        this.campaignModel.findAll({
          where: {
            ...campaignFilter,
            organizationId,
            ...(shouldFilterByUser && userId ? { createdBy: userId } : {}),
          },
          attributes: ['emailsSent', 'emailsBounced'],
          raw: true,
        }),
      ]);

      // Sum campaign emailsSent and emailsBounced for accurate bounce rate calculation
      // This matches the campaign performance table logic
      const totalCampaignEmailsSent = campaignsForBounceRate.reduce(
        (sum: number, campaign: any) => sum + (campaign.emailsSent || 0),
        0
      );
      const totalCampaignEmailsBounced = campaignsForBounceRate.reduce(
        (sum: number, campaign: any) => sum + (campaign.emailsBounced || 0),
        0
      );

      // Use campaign emailsSent for bounce rate calculation, but keep email message count for display
      const totalEmailsSent = totalCampaignEmailsSent; // Use campaign count for consistency
      const totalEmailsBounced = totalCampaignEmailsBounced; // Use campaign count for consistency

      // Calculate engagement rates (based on sent, not delivered)
      const openRate = totalEmailsSent > 0
        ? Math.round((totalEmailsOpened / totalEmailsSent) * 100 * 100) / 100
        : 0;
      const clickRate = totalEmailsSent > 0
        ? Math.round((totalEmailsClicked / totalEmailsSent) * 100 * 100) / 100
        : 0;
      const bounceRate = totalEmailsSent > 0
        ? Math.round((totalEmailsBounced / totalEmailsSent) * 100 * 100) / 100
        : 0;
      const deliveryRate = totalEmailsSent > 0
        ? Math.round((totalEmailsDelivered / totalEmailsSent) * 100 * 100) / 100
        : 0;

      return {
        totalUsers: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
        },
        totalContacts,
        totalTemplates,
        totalEmailsSent,
        totalEmailsDelivered,
        totalEmailsOpened,
        totalEmailsClicked,
        totalEmailsBounced,
        totalEmailsFailed,
        totalCampaigns,
        activeCampaigns,
        engagementMetrics: {
          openRate,
          clickRate,
          bounceRate,
          deliveryRate,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching KPI stats', error);
      throw error;
    }
  }

  /**
   * Get user-wise analytics
   * Returns statistics per user: templates created/used, campaigns created, emails sent
   */
  async getUserWiseAnalytics(query: AnalyticsQueryDto) {
    const { startDate, endDate, organizationId, page = 1, limit = 15, userId: filterUserId } = query;
    
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const currentUser = this.userContextService.getCurrentUser();
    const currentUserId = currentUser?.sub;
    const userRole = currentUser?.role as UserRole;
    const isEmployee = currentUser?.type === 'employee';
    // For employees, treat them as admins (can see all data in selected organization)
    const isAdmin = isEmployee || userRole === UserRole.ADMIN;
    
    // Use filterUserId if provided, otherwise use currentUserId (but not for employees unless filtering)
    // For employees without filterUserId, don't use currentUserId (they're not filtering by their own user record)
    const userId = filterUserId || (!isEmployee ? currentUserId : undefined);
    const shouldFilterByUser = !!filterUserId || !isAdmin;
    
    const dateFilter = this.buildDateFilter(startDate, endDate, userId, !shouldFilterByUser, organizationId);

    try {
      // Calculate pagination offset
      const offset = (page - 1) * limit;

      // Build user filter - if filterUserId is provided, only show that user
      const userWhere = filterUserId
        ? { id: filterUserId, organizationId }
        : dateFilter.userFilter;

      // Get total count of users
      let totalUsers: number;
      if (filterUserId) {
        // When filtering by specific user, count is always 1 or 0
        totalUsers = await this.userModel.count({
          where: userWhere,
        });
      } else if (isAdmin) {
        totalUsers = await this.userModel.count({
          where: userWhere,
        });
      } else if (userId) {
        totalUsers = await this.userModel.count({
          where: userWhere,
        });
      } else {
        totalUsers = 0;
      }

      // Get users based on filter
      let users: User[];
      if (filterUserId) {
        // When filtering by specific user, get only that user (no pagination needed)
        users = await this.userModel.findAll({
          attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'status'],
          where: userWhere,
        });
      } else if (isAdmin) {
        // Admin: show all users in organization with pagination
        users = await this.userModel.findAll({
          attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'status'],
          where: userWhere,
          limit,
          offset,
          order: [['createdAt', 'DESC']],
        });
      } else if (userId) {
        // Regular user: show only themselves
        users = await this.userModel.findAll({
          attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'status'],
          where: userWhere,
          limit,
          offset,
          order: [['createdAt', 'DESC']],
        });
      } else {
        users = [];
      }

      // Get user-wise statistics
      const userAnalytics = await Promise.all(
        users.map(async (user) => {
          // Templates created by user
          const templatesCreated = await this.emailTemplateModel.count({
            where: {
              ...dateFilter.templateFilter,
              createdBy: user.id,
            },
          });

          // Templates used by user (templates used in campaign steps of campaigns created by user)
          const userCampaigns = await this.campaignModel.findAll({
            where: {
              ...dateFilter.campaignFilter,
              createdBy: user.id,
            },
            attributes: [
              'id',
              'emailsSent',
              'emailsBounced',
              'emailsOpened',
              'emailsClicked',
              'emailsReplied',
              'unsubscribes',
            ],
          });
          const campaignIds = userCampaigns.map((c) => c.id);
          
          // Count unique templates used in user's campaign steps
          let templatesUsed = 0;
          if (campaignIds.length > 0) {
            const stepsWithTemplates = await this.campaignStepModel.findAll({
              where: {
                campaignId: { [Op.in]: campaignIds },
                templateId: { [Op.ne]: null },
              },
              attributes: ['templateId'],
              group: ['templateId'],
            });
            templatesUsed = stepsWithTemplates.length;
          }

          // Campaigns created by user
          const campaignsCreated = userCampaigns.length;

          // Sum all email metrics from user's campaigns
          const emailsSent = userCampaigns.reduce(
            (sum: number, campaign: any) => sum + (campaign.emailsSent || 0),
            0
          );
          const emailsBounced = userCampaigns.reduce(
            (sum: number, campaign: any) => sum + (campaign.emailsBounced || 0),
            0
          );
          const emailsOpened = userCampaigns.reduce(
            (sum: number, campaign: any) => sum + (campaign.emailsOpened || 0),
            0
          );
          const emailsClicked = userCampaigns.reduce(
            (sum: number, campaign: any) => sum + (campaign.emailsClicked || 0),
            0
          );
          const emailsReplied = userCampaigns.reduce(
            (sum: number, campaign: any) => sum + (campaign.emailsReplied || 0),
            0
          );
          const unsubscribes = userCampaigns.reduce(
            (sum: number, campaign: any) => sum + (campaign.unsubscribes || 0),
            0
          );

          // Calculate engagement rates
          const openRate = emailsSent > 0
            ? Math.round((emailsOpened / emailsSent) * 100 * 100) / 100
            : 0;
          const clickRate = emailsSent > 0
            ? Math.round((emailsClicked / emailsSent) * 100 * 100) / 100
            : 0;
          const bounceRate = emailsSent > 0
            ? Math.round((emailsBounced / emailsSent) * 100 * 100) / 100
            : 0;

          return {
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            role: user.role,
            status: user.status,
            templatesCreated,
            templatesUsed,
            campaignsCreated,
            emailsSent,
            emailsBounced,
            emailsOpened,
            emailsClicked,
            emailsReplied,
            unsubscribes,
            openRate,
            clickRate,
            bounceRate,
          };
        }),
      );

      // Return paginated response
      const totalPages = Math.ceil(totalUsers / limit);
      return {
        data: userAnalytics,
        total: totalUsers,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Error fetching user-wise analytics', error);
      throw error;
    }
  }

  /**
   * Get campaign-wise analytics
   * Returns statistics per campaign: performance metrics, engagement rates
   */
  async getCampaignWiseAnalytics(query: AnalyticsQueryDto) {
    const { startDate, endDate, organizationId, page = 1, limit = 15, status, userId: filterUserId } = query;
    
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const currentUser = this.userContextService.getCurrentUser();
    const currentUserId = currentUser?.sub;
    const userRole = currentUser?.role as UserRole;
    const isEmployee = currentUser?.type === 'employee';
    // For employees, treat them as admins (can see all data in selected organization)
    const isAdmin = isEmployee || userRole === UserRole.ADMIN;
    
    // Use filterUserId if provided, otherwise use currentUserId (but not for employees unless filtering)
    // For employees without filterUserId, don't use currentUserId (they're not filtering by their own user record)
    const userId = filterUserId || (!isEmployee ? currentUserId : undefined);
    const shouldFilterByUser = !!filterUserId || !isAdmin;
    
    const dateFilter = this.buildDateFilter(startDate, endDate, userId, !shouldFilterByUser, organizationId);

    try {
      // Calculate pagination offset
      const offset = (page - 1) * limit;

      // Add status filter - default to COMPLETED only
      const statusFilter = status && status.length > 0 
        ? status 
        : ['COMPLETED'];

      // Build campaign filter with status and userId filter
      const campaignWhere = {
        ...dateFilter.campaignFilter,
        status: { [Op.in]: statusFilter },
        ...(filterUserId ? { createdBy: filterUserId } : {}),
      };

      // Get total count of campaigns
      const totalCampaigns = await this.campaignModel.count({
        where: campaignWhere,
      });

      const campaigns = await this.campaignModel.findAll({
        where: campaignWhere,
        attributes: [
          'id',
          'name',
          'status',
          'createdBy',
          'totalRecipients',
          'emailsSent',
          'emailsDelivered',
          'emailsOpened',
          'emailsClicked',
          'emailsBounced',
          'emailsFailed',
          'emailsReplied',
          'emailsComplained',
          'unsubscribes',
          'createdAt',
          'completedAt',
        ],
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'email', 'firstName', 'lastName'],
            required: false,
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      const campaignAnalytics = campaigns.map((campaign) => {
        const openRate = campaign.emailsSent > 0
          ? Math.round((campaign.emailsOpened / campaign.emailsSent) * 100 * 100) / 100
          : 0;
        const clickRate = campaign.emailsSent > 0
          ? Math.round((campaign.emailsClicked / campaign.emailsSent) * 100 * 100) / 100
          : 0;
        const bounceRate = campaign.emailsSent > 0
          ? Math.round((campaign.emailsBounced / campaign.emailsSent) * 100 * 100) / 100
          : 0;

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          creator: campaign.creator
            ? {
                id: campaign.creator.id,
                email: campaign.creator.email,
                fullName: `${campaign.creator.firstName || ''} ${campaign.creator.lastName || ''}`.trim() || campaign.creator.email,
              }
            : null,
          status: campaign.status,
          totalRecipients: campaign.totalRecipients,
          emailsSent: campaign.emailsSent,
          emailsDelivered: campaign.emailsDelivered,
          emailsOpened: campaign.emailsOpened,
          emailsClicked: campaign.emailsClicked,
          emailsBounced: campaign.emailsBounced,
          emailsFailed: campaign.emailsFailed,
          emailsReplied: campaign.emailsReplied,
          emailsComplained: campaign.emailsComplained,
          unsubscribes: campaign.unsubscribes,
          openRate,
          clickRate,
          bounceRate,
          createdAt: campaign.createdAt,
          completedAt: campaign.completedAt,
        };
      });

      // Return paginated response
      const totalPages = Math.ceil(totalCampaigns / limit);
      return {
        data: campaignAnalytics,
        total: totalCampaigns,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error('Error fetching campaign-wise analytics', error);
      throw error;
    }
  }

  /**
   * Get email delivery status breakdown
   * Returns count of emails by status
   */
  async getEmailStatusBreakdown(query: AnalyticsQueryDto) {
    const { startDate, endDate, organizationId } = query;
    
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const currentUser = this.userContextService.getCurrentUser();
    const userId = currentUser?.sub;
    const userRole = currentUser?.role as UserRole;
    const isEmployee = currentUser?.type === 'employee';
    // For employees, treat them as admins (can see all data in selected organization)
    const isAdmin = isEmployee || userRole === UserRole.ADMIN;
    const dateFilter = this.buildDateFilter(startDate, endDate, userId, isAdmin, organizationId);

    try {
      // For non-admin users, filter emails by their campaigns
      let emailFilterWhere: any = dateFilter.emailFilter;
      if (!isAdmin && userId) {
        const userCampaigns = await this.campaignModel.findAll({
          where: dateFilter.campaignFilter, // Already includes organizationId and createdBy
          attributes: ['id'],
          raw: true,
        });
        const campaignIds = userCampaigns.map((c: any) => c.id);
        
        if (campaignIds.length > 0) {
          emailFilterWhere = {
            ...dateFilter.emailFilter,
            organizationId, // Direct organization filter
            campaignId: { [Op.in]: campaignIds },
          };
        } else {
          emailFilterWhere = {
            ...dateFilter.emailFilter,
            organizationId, // Direct organization filter
            campaignId: { [Op.eq]: null }, // This will return 0 results
          };
        }
      }

      const [
        queued,
        sending,
        sent,
        delivered,
        bounced,
        failed,
        cancelled,
      ] = await Promise.all([
        this.emailMessageModel.count({
          where: {
            ...emailFilterWhere,
            status: EmailMessageStatus.QUEUED,
          },
        }),
        this.emailMessageModel.count({
          where: {
            ...emailFilterWhere,
            status: EmailMessageStatus.SENDING,
          },
        }),
        this.emailMessageModel.count({
          where: {
            ...emailFilterWhere,
            status: EmailMessageStatus.SENT,
          },
        }),
        this.emailMessageModel.count({
          where: {
            ...emailFilterWhere,
            status: EmailMessageStatus.DELIVERED,
          },
        }),
        this.emailMessageModel.count({
          where: {
            ...emailFilterWhere,
            status: EmailMessageStatus.BOUNCED,
          },
        }),
        this.emailMessageModel.count({
          where: {
            ...emailFilterWhere,
            status: EmailMessageStatus.FAILED,
          },
        }),
        this.emailMessageModel.count({
          where: {
            ...emailFilterWhere,
            status: EmailMessageStatus.CANCELLED,
          },
        }),
      ]);

      const total = queued + sending + sent + delivered + bounced + failed + cancelled;

      return {
        queued,
        sending,
        sent,
        delivered,
        bounced,
        failed,
        cancelled,
        total,
        breakdown: [
          { status: 'QUEUED', count: queued, percentage: total > 0 ? Math.round((queued / total) * 100 * 100) / 100 : 0 },
          { status: 'SENDING', count: sending, percentage: total > 0 ? Math.round((sending / total) * 100 * 100) / 100 : 0 },
          { status: 'SENT', count: sent, percentage: total > 0 ? Math.round((sent / total) * 100 * 100) / 100 : 0 },
          { status: 'DELIVERED', count: delivered, percentage: total > 0 ? Math.round((delivered / total) * 100 * 100) / 100 : 0 },
          { status: 'BOUNCED', count: bounced, percentage: total > 0 ? Math.round((bounced / total) * 100 * 100) / 100 : 0 },
          { status: 'FAILED', count: failed, percentage: total > 0 ? Math.round((failed / total) * 100 * 100) / 100 : 0 },
          { status: 'CANCELLED', count: cancelled, percentage: total > 0 ? Math.round((cancelled / total) * 100 * 100) / 100 : 0 },
        ],
      };
    } catch (error) {
      this.logger.error('Error fetching email status breakdown', error);
      throw error;
    }
  }

  /**
   * Get campaign status distribution
   * Returns count of campaigns by status
   */
  async getCampaignStatusDistribution(query: AnalyticsQueryDto) {
    const { startDate, endDate, organizationId } = query;
    
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const currentUser = this.userContextService.getCurrentUser();
    const userId = currentUser?.sub;
    const userRole = currentUser?.role as UserRole;
    const isEmployee = currentUser?.type === 'employee';
    // For employees, treat them as admins (can see all data in selected organization)
    const isAdmin = isEmployee || userRole === UserRole.ADMIN;
    const dateFilter = this.buildDateFilter(startDate, endDate, userId, isAdmin, organizationId);

    try {
      const [
        draft,
        active,
        paused,
        completed,
        cancelled,
      ] = await Promise.all([
        this.campaignModel.count({
          where: {
            ...dateFilter.campaignFilter,
            status: 'DRAFT',
          },
        }),
        this.campaignModel.count({
          where: {
            ...dateFilter.campaignFilter,
            status: 'ACTIVE',
          },
        }),
        this.campaignModel.count({
          where: {
            ...dateFilter.campaignFilter,
            status: 'PAUSED',
          },
        }),
        this.campaignModel.count({
          where: {
            ...dateFilter.campaignFilter,
            status: 'COMPLETED',
          },
        }),
        this.campaignModel.count({
          where: {
            ...dateFilter.campaignFilter,
            status: 'CANCELLED',
          },
        }),
      ]);

      const total = draft + active + paused + completed + cancelled;

      return {
        draft,
        active,
        paused,
        completed,
        cancelled,
        total,
        distribution: [
          { status: 'DRAFT', count: draft, percentage: total > 0 ? Math.round((draft / total) * 100 * 100) / 100 : 0 },
          { status: 'ACTIVE', count: active, percentage: total > 0 ? Math.round((active / total) * 100 * 100) / 100 : 0 },
          { status: 'PAUSED', count: paused, percentage: total > 0 ? Math.round((paused / total) * 100 * 100) / 100 : 0 },
          { status: 'COMPLETED', count: completed, percentage: total > 0 ? Math.round((completed / total) * 100 * 100) / 100 : 0 },
          { status: 'CANCELLED', count: cancelled, percentage: total > 0 ? Math.round((cancelled / total) * 100 * 100) / 100 : 0 },
        ],
      };
    } catch (error) {
      this.logger.error('Error fetching campaign status distribution', error);
      throw error;
    }
  }

  /**
   * Build date filter conditions for different entities
   * Filters by organizationId (mandatory) and userId (if not admin)
   */
  private buildDateFilter(
    startDate?: string, 
    endDate?: string, 
    userId?: string, 
    isAdmin: boolean = false,
    organizationId?: string
  ) {
    const dateConditions: any = {};

    if (startDate) {
      dateConditions[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      // Include the entire end date
      end.setHours(23, 59, 59, 999);
      dateConditions[Op.lte] = end;
    }

    const baseDateFilter = startDate || endDate ? { createdAt: dateConditions } : {};

    // Build filters with organizationId (mandatory) and user context
    // Users: filter by organizationId (and userId if not admin)
    const userFilter = isAdmin || !userId
      ? { ...baseDateFilter, organizationId }
      : { ...baseDateFilter, organizationId, id: userId };
    
    // Contacts: filter by organizationId only (organization-wide)
    const contactFilter = { ...baseDateFilter, organizationId };
    
    // Templates: filter by organizationId (and createdBy if not admin)
    const templateFilter = isAdmin || !userId
      ? { ...baseDateFilter, organizationId }
      : { ...baseDateFilter, organizationId, createdBy: userId };
    
    // Campaigns: filter by organizationId (and createdBy if not admin)
    const campaignFilter = isAdmin || !userId
      ? { ...baseDateFilter, organizationId }
      : { ...baseDateFilter, organizationId, createdBy: userId };
    
    // Email messages: base filter with organizationId (will be filtered by campaign IDs in methods that use it)
    // Note: Email messages are linked via campaigns, so organizationId is enforced through campaign filter
    const emailFilter = baseDateFilter;

    return {
      userFilter,
      contactFilter,
      templateFilter,
      campaignFilter,
      emailFilter,
    };
  }

  /**
   * Get list of all users in the organization (for dropdown filter)
   * Returns all users in the organization
   */
  async getUsersWithAnalytics(query: AnalyticsQueryDto) {
    const { organizationId } = query;
    
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    try {
      // Get all users in the organization
      const users = await this.userModel.findAll({
        where: {
          organizationId,
        },
        attributes: ['id', 'email', 'firstName', 'lastName'],
        order: [['firstName', 'ASC'], ['lastName', 'ASC']],
      });

      // Format and return users
      return users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      }));
    } catch (error) {
      this.logger.error('Error fetching users with analytics', error);
      throw error;
    }
  }

  /**
   * Get email messages for a specific user with campaign information
   * Used for user analytics email details modal
   */
  async getUserEmails(query: {
    userId: string;
    organizationId: string;
    eventType?: string;
    page?: number | string;
    limit?: number | string;
    startDate?: string;
    endDate?: string;
  }) {
    // Convert page and limit to numbers (they come as strings from query params)
    const pageNum = typeof query.page === 'string' ? parseInt(query.page, 10) : (query.page || 1);
    const limitNum = typeof query.limit === 'string' ? parseInt(query.limit, 10) : (query.limit || 10);
    const { userId, organizationId, eventType, startDate, endDate } = query;

    if (!userId || !organizationId) {
      throw new Error('User ID and Organization ID are required');
    }

    try {
      const offset = (pageNum - 1) * limitNum;

      // Get all campaigns created by this user
      const userCampaigns = await this.campaignModel.findAll({
        where: {
          organizationId,
          createdBy: userId,
        },
        attributes: ['id', 'name'],
      });

      const campaignIds = userCampaigns.map((c) => c.id);
      const campaignMap = new Map(userCampaigns.map((c) => [c.id, c.name]));

      if (campaignIds.length === 0) {
        return {
          data: [],
          total: 0,
          page: pageNum,
          limit: limitNum,
          totalPages: 0,
        };
      }

      // Build date filter
      const dateConditions: any = {};
      if (startDate) {
        dateConditions[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateConditions[Op.lte] = end;
      }

      // Build email filter
      const emailWhere: any = {
        organizationId,
        campaignId: { [Op.in]: campaignIds },
      };

      if (startDate || endDate) {
        emailWhere.sentAt = dateConditions;
      }

      // Filter by event type and exclude SENDING/DELIVERED
      if (eventType === 'OPENED') {
        emailWhere.openedAt = { [Op.ne]: null };
        emailWhere.status = { [Op.notIn]: [EmailMessageStatus.SENDING, EmailMessageStatus.DELIVERED] };
      } else if (eventType === 'CLICKED') {
        emailWhere.clickedAt = { [Op.ne]: null };
        emailWhere.status = { [Op.notIn]: [EmailMessageStatus.SENDING, EmailMessageStatus.DELIVERED] };
      } else if (eventType === 'REPLIED') {
        emailWhere.repliedAt = { [Op.ne]: null };
        emailWhere.status = { [Op.notIn]: [EmailMessageStatus.SENDING, EmailMessageStatus.DELIVERED] };
      } else if (eventType === 'UNSUBSCRIBED') {
        emailWhere.unsubscribedAt = { [Op.ne]: null };
        emailWhere.status = { [Op.notIn]: [EmailMessageStatus.SENDING, EmailMessageStatus.DELIVERED] };
      } else if (eventType === 'BOUNCED') {
        emailWhere.status = EmailMessageStatus.BOUNCED;
      } else if (eventType === 'SENT') {
        emailWhere.status = EmailMessageStatus.SENT;
      } else {
        // For 'all' or no eventType, exclude SENDING and DELIVERED statuses
        emailWhere.status = {
          [Op.notIn]: [EmailMessageStatus.SENDING, EmailMessageStatus.DELIVERED],
        };
      }

      // Get total count
      const total = await this.emailMessageModel.count({
        where: emailWhere,
      });

      // Get emails with contact and campaign information
      const emails = await this.emailMessageModel.findAll({
        where: emailWhere,
        include: [
          {
            model: Contact,
            attributes: ['id', 'email', 'firstName', 'lastName'],
            required: false,
          },
          {
            model: Campaign,
            attributes: ['id', 'name'],
            required: false,
          },
        ],
        order: [['sentAt', 'DESC']],
        limit: limitNum,
        offset,
      });

      // Format response
      const formattedEmails = emails.map((email: any) => ({
        id: email.id,
        subject: email.subject || '',
        status: email.status,
        sentAt: email.sentAt,
        scheduledSendAt: email.scheduledSendAt,
        contact: email.contact
          ? {
              email: email.contact.email,
              firstName: email.contact.firstName,
              lastName: email.contact.lastName,
            }
          : null,
        campaign: email.campaign
          ? {
              id: email.campaign.id,
              name: email.campaign.name,
            }
          : null,
        openedAt: email.openedAt,
        clickedAt: email.clickedAt,
        repliedAt: email.repliedAt,
        bouncedAt: email.bouncedAt,
        unsubscribedAt: email.unsubscribedAt,
        bounceReason: email.bounceReason,
        bounceType: email.bounceType,
        clickedUrl: email.clickedUrl,
      }));

      return {
        data: formattedEmails,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (error) {
      this.logger.error('Error fetching user emails', error);
      throw error;
    }
  }

  /**
   * Get platform-wide KPI statistics (aggregated across all organizations)
   * Only accessible to SUPERADMIN employees
   */
  async getPlatformKpiStats(query: AnalyticsQueryDto) {
    const { startDate, endDate } = query;

    const dateConditions: any = {};
    if (startDate) {
      dateConditions[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateConditions[Op.lte] = end;
    }

    const baseDateFilter = startDate || endDate ? { createdAt: dateConditions } : {};

    try {
      // Get totals across all organizations (no organizationId filter)
      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalContacts,
        totalTemplates,
        totalCampaigns,
        activeCampaigns,
        totalEmailsDelivered,
        totalEmailsOpened,
        totalEmailsClicked,
        totalEmailsBouncedFromMessages,
        totalEmailsFailed,
        campaignsForBounceRate,
        totalOrganizations,
        subscriptionsWithPlans,
      ] = await Promise.all([
        // Total users across all organizations
        this.userModel.count({
          where: baseDateFilter,
        }),
        this.userModel.count({
          where: {
            ...baseDateFilter,
            status: UserStatus.ACTIVE,
          },
        }),
        this.userModel.count({
          where: {
            ...baseDateFilter,
            status: { [Op.ne]: UserStatus.ACTIVE },
          },
        }),
        // Total contacts across all organizations
        this.contactModel.count({
          where: baseDateFilter,
        }),
        // Total templates across all organizations
        this.emailTemplateModel.count({
          where: baseDateFilter,
        }),
        // Total campaigns across all organizations
        this.campaignModel.count({
          where: baseDateFilter,
        }),
        // Active campaigns across all organizations
        this.campaignModel.count({
          where: {
            ...baseDateFilter,
            status: 'ACTIVE',
          },
        }),
        // Email statistics across all organizations
        this.emailMessageModel.count({
          where: {
            ...baseDateFilter,
            status: EmailMessageStatus.DELIVERED,
          },
        }),
        this.emailMessageModel.count({
          where: {
            ...baseDateFilter,
            openedAt: { [Op.ne]: null },
          },
        }),
        this.emailMessageModel.count({
          where: {
            ...baseDateFilter,
            clickedAt: { [Op.ne]: null },
          },
        }),
        this.emailMessageModel.count({
          where: {
            ...baseDateFilter,
            status: EmailMessageStatus.BOUNCED,
          },
        }),
        this.emailMessageModel.count({
          where: {
            ...baseDateFilter,
            status: EmailMessageStatus.FAILED,
          },
        }),
        // Get campaigns for bounce rate calculation
        this.campaignModel.findAll({
          where: baseDateFilter,
          attributes: ['id', 'emailsSent', 'emailsBounced'],
          raw: true,
        }),
        // Total organizations
        this.organizationModel.count({
          where: baseDateFilter,
        }),
        // Get active subscriptions with their plans for breakdown and revenue calculation
        this.subscriptionModel.findAll({
          where: {
            status: { [Op.in]: ['ACTIVE', 'TRIAL'] },
          },
          include: [
            {
              model: this.subscriptionPlanModel,
              as: 'plan',
              required: true,
              attributes: ['id', 'name'],
            },
          ],
          attributes: ['id', 'planId', 'status', 'finalAmount', 'amount', 'currency'],
        }),
      ]);

      // Calculate bounce rate from campaigns
      const totalCampaignEmailsSent = campaignsForBounceRate.reduce(
        (sum: number, campaign: any) => sum + (campaign.emailsSent || 0),
        0
      );
      const totalCampaignEmailsBounced = campaignsForBounceRate.reduce(
        (sum: number, campaign: any) => sum + (campaign.emailsBounced || 0),
        0
      );

      const totalEmailsSent = totalCampaignEmailsSent;
      const totalEmailsBounced = totalCampaignEmailsBounced; // Use campaign count for consistency

      // Calculate engagement rates
      const openRate = totalEmailsSent > 0
        ? Math.round((totalEmailsOpened / totalEmailsSent) * 100 * 100) / 100
        : 0;
      const clickRate = totalEmailsSent > 0
        ? Math.round((totalEmailsClicked / totalEmailsSent) * 100 * 100) / 100
        : 0;
      const bounceRate = totalEmailsSent > 0
        ? Math.round((totalEmailsBounced / totalEmailsSent) * 100 * 100) / 100
        : 0;
      const deliveryRate = totalEmailsSent > 0
        ? Math.round((totalEmailsDelivered / totalEmailsSent) * 100 * 100) / 100
        : 0;

      // Calculate subscription breakdown and total revenue
      const subscriptionBreakdown = {
        trial: 0,
        starter: 0,
        pro: 0,
        scale: 0,
      };

      let totalRevenue = 0;
      subscriptionsWithPlans.forEach((sub: any) => {
        const planId = sub.plan?.id || sub.planId;
        if (planId === SUBSCRIPTION_PLAN_IDS.FREE_TRIAL) {
          subscriptionBreakdown.trial++;
        } else if (planId === SUBSCRIPTION_PLAN_IDS.STARTER) {
          subscriptionBreakdown.starter++;
        } else if (planId === SUBSCRIPTION_PLAN_IDS.PRO) {
          subscriptionBreakdown.pro++;
        } else if (planId === SUBSCRIPTION_PLAN_IDS.SCALE) {
          subscriptionBreakdown.scale++;
        }
        
        // Calculate revenue (use finalAmount if available, otherwise amount)
        // Only count non-trial subscriptions for revenue
        if (planId !== SUBSCRIPTION_PLAN_IDS.FREE_TRIAL) {
          const revenue = sub.finalAmount || sub.amount || 0;
          totalRevenue += parseFloat(revenue) || 0;
        }
      });

      return {
        totalUsers: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
        },
        totalContacts,
        totalTemplates,
        totalEmailsSent,
        totalEmailsDelivered,
        totalEmailsOpened,
        totalEmailsClicked,
        totalEmailsBounced,
        totalEmailsFailed,
        totalCampaigns,
        activeCampaigns,
        totalOrganizations,
        totalRevenue,
        subscriptionBreakdown,
        engagementMetrics: {
          openRate,
          clickRate,
          bounceRate,
          deliveryRate,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching platform KPI stats', error);
      throw error;
    }
  }

  /**
   * Get organization breakdown for platform analytics with pagination
   * Returns metrics per organization: users, contacts, contact lists, templates, campaigns, subscription
   */
  async getOrganizationBreakdown(query: AnalyticsQueryDto) {
    const { startDate, endDate, page = 1, limit = 15 } = query;

    const dateConditions: any = {};
    if (startDate) {
      dateConditions[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateConditions[Op.lte] = end;
    }

    const baseDateFilter = startDate || endDate ? { createdAt: dateConditions } : {};

    try {
      // Calculate pagination
      const offset = (page - 1) * limit;

      // Get total count of organizations
      const totalOrganizations = await this.organizationModel.count({
        where: baseDateFilter,
      });

      // Get paginated organizations
      const organizations = await this.organizationModel.findAll({
        attributes: ['id', 'name', 'slug'],
        where: baseDateFilter,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        raw: true,
      }) as any[];

      // Get all active subscriptions with plans for lookup and revenue calculation
      const allSubscriptions = await this.subscriptionModel.findAll({
        where: {
          status: { [Op.in]: ['ACTIVE', 'TRIAL'] },
        },
        include: [
          {
            model: this.subscriptionPlanModel,
            as: 'plan',
            required: true,
            attributes: ['id', 'name'],
          },
        ],
        attributes: ['id', 'organizationId', 'planId', 'status', 'finalAmount', 'amount', 'currency'],
      });

      // Create a map of organizationId -> subscription plan name
      const subscriptionMap = new Map<string, string>();
      allSubscriptions.forEach((sub: any) => {
        const planId = sub.plan?.id || sub.planId;
        let planName = 'None';
        if (planId === SUBSCRIPTION_PLAN_IDS.FREE_TRIAL) {
          planName = 'Trial';
        } else if (planId === SUBSCRIPTION_PLAN_IDS.STARTER) {
          planName = 'Starter';
        } else if (planId === SUBSCRIPTION_PLAN_IDS.PRO) {
          planName = 'Pro';
        } else if (planId === SUBSCRIPTION_PLAN_IDS.SCALE) {
          planName = 'Scale';
        }
        subscriptionMap.set(sub.organizationId, planName);
      });

      const breakdown = await Promise.all(
        organizations.map(async (org: any) => {
          const orgId = org.id;
          const [
            users,
            contacts,
            contactLists,
            templates,
            campaigns,
          ] = await Promise.all([
            this.userModel.count({
              where: { ...baseDateFilter, organizationId: orgId },
            }),
            this.contactModel.count({
              where: { ...baseDateFilter, organizationId: orgId },
            }),
            this.contactListModel.count({
              where: { ...baseDateFilter, organizationId: orgId },
            }),
            this.emailTemplateModel.count({
              where: { ...baseDateFilter, organizationId: orgId },
            }),
            this.campaignModel.count({
              where: { ...baseDateFilter, organizationId: orgId },
            }),
          ]);

          // Calculate revenue for this organization
          const orgSubscription = allSubscriptions.find((sub: any) => sub.organizationId === orgId);
          let revenue = 0;
          if (orgSubscription) {
            const planId = orgSubscription.plan?.id || orgSubscription.planId;
            // Only count non-trial subscriptions for revenue
            if (planId !== SUBSCRIPTION_PLAN_IDS.FREE_TRIAL) {
              const amountValue = orgSubscription.finalAmount || orgSubscription.amount;
              revenue = amountValue ? parseFloat(String(amountValue)) || 0 : 0;
            }
          }

          return {
            organizationId: orgId,
            organizationName: org.name,
            organizationSlug: org.slug,
            usersCount: users,
            contactsCount: contacts,
            contactListsCount: contactLists,
            templatesCount: templates,
            campaignsCount: campaigns,
            subscription: subscriptionMap.get(orgId) || 'None',
            revenue: revenue,
          };
        })
      );

      return {
        data: breakdown,
        total: totalOrganizations,
        page,
        limit,
        totalPages: Math.ceil(totalOrganizations / limit),
      };
    } catch (error) {
      this.logger.error('Error fetching organization breakdown', error);
      throw error;
    }
  }
}

