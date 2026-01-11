import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize, Op, Transaction, UniqueConstraintError } from 'sequelize';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { EmailTemplateQueryDto } from './dto/email-template-query.dto';
import { EmailTemplatePreviewDto } from './dto/email-template-preview.dto';
import { EmailTemplateRepository } from './email-templates.repository';
import { EmailTemplate } from './entities/email-template.entity';
import { SystemTemplate } from './entities/system-template.entity';
import { CampaignStep } from 'src/resources/campaigns/entities/campaign-step.entity';
import { Campaign } from 'src/resources/campaigns/entities/campaign.entity';
import { User } from 'src/resources/users/entities/user.entity';
import { BaseService } from 'src/common/services/base.service';
import { UserContextService } from 'src/common/services/user-context.service';
import { TransactionManager } from 'src/common/services/transaction-manager.service';
import { WhereOptions } from 'sequelize';
import {
  EMAIL_TEMPLATE_VARIABLE_FIELDS,
  DEFAULT_EMAIL_TEMPLATE_CONTACT_DATA,
} from './email-templates.constants';
import { EmailTemplateType } from './enums/email-template-type.enum';
import { EmailSendFormat } from './enums/email-send-format.enum';
import { UserRole } from 'src/common/enums/roles.enum';

interface TemplateContent {
  htmlContent?: string;
  textContent?: string;
  subject: string;
  category?: string;
}

@Injectable()
export class EmailTemplatesService extends BaseService<EmailTemplate> {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(
    private readonly emailTemplateRepository: EmailTemplateRepository,
    private readonly userContextService: UserContextService,
    private readonly transactionManager: TransactionManager,
    @InjectModel(CampaignStep)
    private readonly campaignStepModel: typeof CampaignStep,
    @InjectModel(Campaign)
    private readonly campaignModel: typeof Campaign,
    @InjectModel(SystemTemplate)
    private readonly systemTemplateModel: typeof SystemTemplate,
  ) {
    super(emailTemplateRepository);
  }

  async createEmailTemplate(
    createEmailTemplateDto: CreateEmailTemplateDto,
  ): Promise<EmailTemplate> {
    return this.transactionManager.execute(async (transaction) => {
      // Validate name uniqueness (database constraint will also enforce this)
      await this.validateNameUniqueness(
        createEmailTemplateDto.organizationId,
        createEmailTemplateDto.name,
        undefined,
        transaction,
      );

      // Merge system template content if provided
      const templateContent = await this.mergeSystemTemplateContent(
        createEmailTemplateDto,
        transaction,
      );

      // Build template data, explicitly excluding systemTemplateId (it's only used to fetch content)
      const { systemTemplateId, ...dtoWithoutSystemTemplateId } = createEmailTemplateDto;
      
      const templateData: Partial<EmailTemplate> = {
        ...dtoWithoutSystemTemplateId,
        ...templateContent,
        type: createEmailTemplateDto.type || EmailTemplateType.PRIVATE,
        sendFormat: createEmailTemplateDto.sendFormat || EmailSendFormat.TEXT,
        variables: createEmailTemplateDto.variables || this.getVariableFields(),
      };

      const currentUserId = this.userContextService.getCurrentUserId();
      
      try {
        const newTemplate = await this.emailTemplateRepository.create(
          templateData,
          transaction,
          currentUserId,
        );
        this.logger.log(`Created email template: ${newTemplate.id} (${newTemplate.name})`);
        return newTemplate;
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          throw new ConflictException(
            `Template with name ${createEmailTemplateDto.name} already exists in this organization`,
          );
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(`Failed to create email template: ${errorMessage}`, errorStack);
        throw error;
      }
    });
  }

  async findAll(query?: EmailTemplateQueryDto) {
    const currentUser = this.userContextService.getCurrentUser();
    const currentUserId = currentUser?.sub;
    const currentUserRole = currentUser?.role;
    const isEmployee = currentUser?.type === 'employee';
    const queryOrganizationId = query?.organizationId;

    // Build where conditions based on user type
    let whereConditions: any = {};
    
    if (!isEmployee) {
      // Regular users: use buildAccessFilter with organizationId from JWT
      // buildAccessFilter handles showing user's own templates + public templates
      const organizationId = currentUser?.organizationId;
      if (organizationId) {
        whereConditions = this.buildAccessFilter(
          organizationId,
          currentUserId,
          currentUserRole,
          query?.type,
        );
      } else {
        // No organizationId for regular user - should not happen, but handle gracefully
        throw new BadRequestException('User must be associated with an organization');
      }
    } else {
      // Employees: BaseRepository will handle tenant filtering via organizationId in RepositoryOptions
      // We can add additional filters here (type, category, etc.)
      if (query?.type) {
        whereConditions.type = query.type;
      }
    }

    if (query?.category) {
      whereConditions.category = query.category;
    }

    return this.emailTemplateRepository.findAll({
      where: whereConditions,
      organizationId: isEmployee ? queryOrganizationId : undefined, // Only pass for employees
      pagination: {
        page: query?.page || 1,
        limit: query?.limit || 10,
        searchTerm: query?.searchTerm || '',
        searchFields: ['name', 'subject', 'category'],
        sortBy: 'createdAt',
        sortOrder: query?.sortOrder || 'DESC',
      },
      include: [
        {
          model: User,
          as: 'createdByUser',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
  }

  async findEmailTemplateById(id: string, transaction?: Transaction): Promise<EmailTemplate> {
    return this.findTemplateOrThrow(id, transaction);
  }

  private async findTemplateOrThrow(
    id: string,
    transaction?: Transaction,
  ): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepository.findById(id, transaction);
    if (!template) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }
    return template as EmailTemplate;
  }

  async updateEmailTemplate(
    id: string,
    updateEmailTemplateDto: UpdateEmailTemplateDto,
  ): Promise<EmailTemplate> {
    return this.transactionManager.execute(async (transaction) => {
      const template = await this.findTemplateOrThrow(id, transaction);

      if (updateEmailTemplateDto.name) {
        await this.validateNameUniqueness(
          template.organizationId,
          updateEmailTemplateDto.name,
          id,
          transaction,
        );
      }

      // Build update data, converting string dates to Date objects
      const { lastUsedAt: lastUsedAtString, ...restDto } = updateEmailTemplateDto;
      const updateData: Partial<EmailTemplate> = {
        ...restDto,
        ...(lastUsedAtString && {
          lastUsedAt: typeof lastUsedAtString === 'string' 
            ? new Date(lastUsedAtString) 
            : lastUsedAtString,
        }),
      };

      try {
        const affectedCount = await this.emailTemplateRepository.update(
          { id },
          updateData,
          transaction,
        );

        if (affectedCount === 0) {
          throw new NotFoundException(`Email template with ID ${id} not found`);
        }

        this.logger.log(`Updated email template: ${id}`);
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          throw new ConflictException(
            `Template with name ${updateEmailTemplateDto.name} already exists in this organization`,
          );
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(`Failed to update email template ${id}: ${errorMessage}`, errorStack);
        throw error;
      }

      // Return updated template
      return this.findTemplateOrThrow(id, transaction);
    });
  }

  async removeEmailTemplate(id: string): Promise<EmailTemplate> {
    return this.transactionManager.execute(async (transaction) => {
      const template = await this.findTemplateOrThrow(id, transaction);
      await this.validateTemplateCanBeDeleted(id, transaction);
      // Hard delete - permanently remove the template
      await this.hardDelete({ id }, transaction);
      this.logger.log(`Deleted email template: ${id} (${template.name})`);
      return template;
    });
  }

  async permanentlyDeleteEmailTemplate(id: string): Promise<EmailTemplate> {
    // Alias for removeEmailTemplate - both do hard delete now
    return this.removeEmailTemplate(id);
  }

  async validateTemplateCanBeDeleted(
    templateId: string,
    transaction?: Transaction,
  ): Promise<void> {
    // Optimized: Single query to get both count and sample campaigns
    // Check for campaigns using this template (excluding DRAFT campaigns)
    // DRAFT campaigns can be easily modified, so we allow deletion if only used in drafts
    const campaignSteps = await this.campaignStepModel.findAll({
      where: { templateId },
      include: [
        {
          model: Campaign,
          attributes: ['id', 'name', 'status'],
          where: {
            status: { [Op.ne]: 'DRAFT' },
          },
          required: true,
        },
      ],
      limit: 10,
      transaction,
    });

    if (campaignSteps.length > 0) {
      // Extract campaign names from the results we already have
      const campaignNames = campaignSteps
        .map((step) => {
          const campaign = step.campaign as Campaign | null;
          if (!campaign) return null;
          const name = campaign.name;
          const status = campaign.status;
          return name ? `"${name}" (${status})` : null;
        })
        .filter((name): name is string => name !== null)
        .join(', ');

      // Only count if we need to show "and X more"
      const totalCount = campaignSteps.length >= 10
        ? await this.campaignStepModel.count({
            where: { templateId },
            include: [
              {
                model: Campaign,
                where: {
                  status: { [Op.ne]: 'DRAFT' },
                },
                required: true,
              },
            ],
            transaction,
          })
        : campaignSteps.length;

      const message = totalCount > campaignSteps.length
        ? `Cannot delete email template. It is being used by ${totalCount} campaign step(s) in non-draft campaign(s): ${campaignNames} and ${totalCount - campaignSteps.length} more. Please remove it from all campaigns first.`
        : `Cannot delete email template. It is being used by ${totalCount} campaign step(s) in non-draft campaign(s): ${campaignNames}. Please remove it from all campaigns first.`;

      throw new BadRequestException(message);
    }
  }

  async restoreEmailTemplate(id: string): Promise<EmailTemplate> {
    return this.transactionManager.execute(async (transaction) => {
      await this.restore({ id }, transaction);
      const restored = await this.findTemplateOrThrow(id, transaction);
      this.logger.log(`Restored email template: ${id}`);
      return restored;
    });
  }


  getVariableFields(): string[] {
    return [...EMAIL_TEMPLATE_VARIABLE_FIELDS] as string[];
  }

  async incrementUsageCount(templateId: string): Promise<void> {
    return this.transactionManager.execute(async (transaction) => {
      // Verify template exists
      await this.findTemplateOrThrow(templateId, transaction);

      // Use atomic SQL increment to prevent race conditions
      await this.emailTemplateRepository.update(
        { id: templateId },
        {
          usageCount: Sequelize.literal('usage_count + 1') as unknown as number,
          lastUsedAt: new Date(),
        },
        transaction,
      );
    });
  }

  async renderPreview(
    templateId: string,
    previewDto: EmailTemplatePreviewDto,
  ): Promise<{
    subject: string;
    htmlContent: string;
    textContent: string;
  }> {
    const template = await this.findEmailTemplateById(templateId);

    const contactData =
      previewDto.contactData || DEFAULT_EMAIL_TEMPLATE_CONTACT_DATA;

    const renderedSubject = this.replaceVariables(template.subject, contactData);

    const renderedHtmlContent = template.htmlContent
      ? this.replaceVariables(template.htmlContent, contactData)
      : null;

    const renderedTextContent = template.textContent
      ? this.replaceVariables(template.textContent, contactData)
      : null;

    return {
      subject: renderedSubject,
      htmlContent: renderedHtmlContent,
      textContent: renderedTextContent,
    };
  }

  private replaceVariables(content: string, contactData: Record<string, string>): string {
    const varMap = new Map(Object.entries(contactData));
    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => varMap.get(key) || '');
  }

  private buildAccessFilter(
    organizationId: string,
    userId?: string,
    userRole?: string,
    type?: EmailTemplateType,
  ): WhereOptions<EmailTemplate> {
    const isAdmin = userRole === UserRole.ADMIN;

    if (isAdmin) {
      // Admin: show all templates in organization
      return type !== undefined
        ? { organizationId, type }
        : { organizationId };
    }

    // Normal users: show their own records + public records
    if (type === undefined) {
      // Default: show user's templates and public templates
      if (userId) {
        return {
          [Op.or]: [
            // User's own templates in their organization
            { organizationId, createdBy: userId },
            // Public templates in their organization
            { organizationId, type: EmailTemplateType.PUBLIC },
          ],
        };
      }
      // No user ID: show public templates only
      return { organizationId, type: EmailTemplateType.PUBLIC };
    }

    if (type === EmailTemplateType.PUBLIC) {
      // Show only public templates
      return { organizationId, type: EmailTemplateType.PUBLIC };
    }

    // Show only private templates that belong to the current user
    if (userId) {
      return { organizationId, type: EmailTemplateType.PRIVATE, createdBy: userId };
    }

    // No user ID: return impossible condition (no results)
    return { organizationId, id: { [Op.eq]: null } };
  }

  private async validateNameUniqueness(
    organizationId: string,
    name: string,
    excludeId?: string,
    transaction?: Transaction,
  ): Promise<void> {
    const where: WhereOptions<EmailTemplate> = {
      organizationId,
      name,
    };

    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }

    const existing = await this.emailTemplateRepository.findOne({
      where,
      transaction,
    });

    if (existing) {
      throw new ConflictException(
        `Template with name ${name} already exists in this organization`,
      );
    }
  }

  /**
   * Merges system template content with user-provided content.
   * User-provided content always takes priority over system template content.
   */
  private async mergeSystemTemplateContent(
    dto: CreateEmailTemplateDto,
    transaction?: Transaction,
  ): Promise<TemplateContent> {
    if (!dto.systemTemplateId) {
      return {
        htmlContent: dto.htmlContent,
        textContent: dto.textContent,
        subject: dto.subject,
        category: dto.category,
      };
    }

    const systemTemplate = await this.systemTemplateModel.findByPk(
      dto.systemTemplateId,
      { transaction },
    );

    if (!systemTemplate) {
      throw new NotFoundException(
        `System template with ID ${dto.systemTemplateId} not found`,
      );
    }

    // User-provided content always takes priority over system template content
    // System template content is only used as fallback if user hasn't provided it
    return {
      htmlContent: dto.htmlContent ?? systemTemplate.htmlContent ?? undefined,
      textContent: dto.textContent ?? systemTemplate.textContent ?? undefined,
      subject: dto.subject || systemTemplate.subject,
      category: dto.category ?? systemTemplate.category ?? undefined,
    };
  }

  // System Templates Methods
  async findAllSystemTemplates(): Promise<SystemTemplate[]> {
    const templates = await this.systemTemplateModel.findAll({
      order: [['category', 'ASC'], ['name', 'ASC']],
    });
    // Convert Sequelize instances to plain objects
    return templates.map((template) => template.toJSON());
  }
}
