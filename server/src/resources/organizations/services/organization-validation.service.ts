import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { Transaction, Op } from 'sequelize';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { OrganizationRepository } from '../organizations.repository';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class OrganizationValidator {
  constructor(private readonly organizationRepository: OrganizationRepository) {}

  async validateAndSanitize(
    dto: CreateOrganizationDto | UpdateOrganizationDto,
    options: {
      isUpdate?: boolean;
      excludeId?: string;
      transaction?: Transaction;
    } = {}
  ): Promise<CreateOrganizationDto | UpdateOrganizationDto> {

    const sanitized = this.sanitize(dto);

    const dtoClass = options.isUpdate ? UpdateOrganizationDto : CreateOrganizationDto;
    const validationErrors = await validate(
      plainToInstance(dtoClass, sanitized)
    );

    if (validationErrors.length > 0) {
      const messages = validationErrors.flatMap(error =>
        Object.values(error.constraints || {})
      );
      throw new BadRequestException(messages.join(', '));
    }

    await this.validateUniqueness(sanitized, options);

    return sanitized;
  }

  private sanitize(dto: CreateOrganizationDto | UpdateOrganizationDto): CreateOrganizationDto | UpdateOrganizationDto {
    const sanitized = { ...dto };

    if (sanitized.slug && sanitized.slug.trim()) {
      // Optimized: Single regex pass instead of multiple replace calls
      sanitized.slug = sanitized.slug
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-') // Replace all non-alphanumeric (except hyphens) with single hyphen
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
      
      // If slug becomes empty after sanitization, remove it
      if (!sanitized.slug) {
        delete sanitized.slug;
      }
    } else {
      // Remove empty or whitespace-only slugs
      delete sanitized.slug;
    }

    if (sanitized.domain) {
      sanitized.domain = sanitized.domain
        .replace(/^https?:\/\//i, '')
        .replace(/\/$/, '');
    }

    if (sanitized.name) {
      sanitized.name = sanitized.name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    // Trim all string values in one pass
    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      }
    });

    return sanitized;
  }

  /**
   * Validates uniqueness of name and slug if provided
   * Domain and billingEmail are no longer checked for uniqueness (domain is metadata, billingEmail can be shared)
   */
  private async validateUniqueness(
    dto: CreateOrganizationDto | UpdateOrganizationDto,
    options: { excludeId?: string; transaction?: Transaction }
  ): Promise<void> {
    // Check name uniqueness (required field)
    // Note: Name is sanitized to Title Case before this check, so case-sensitive comparison is sufficient
    if (dto.name && dto.name.trim()) {
      const nameWhere: any = {
        name: dto.name.trim(),
      };

      if (options.excludeId) {
        nameWhere.id = { [Op.ne]: options.excludeId };
      }

      const existingByName = await this.organizationRepository.findOne({
        where: nameWhere,
        transaction: options.transaction,
      });

      if (existingByName) {
        throw new ConflictException(
          `Organization with name '${dto.name.trim()}' already exists`,
        );
      }
    }

    // Check slug uniqueness if provided
    if (dto.slug && dto.slug.trim()) {
      const slugWhere: any = {
        slug: dto.slug,
      };

      if (options.excludeId) {
        slugWhere.id = { [Op.ne]: options.excludeId };
      }

      const existingBySlug = await this.organizationRepository.findOne({
        where: slugWhere,
        transaction: options.transaction,
      });

      if (existingBySlug) {
        throw new ConflictException(
          `Organization with slug '${dto.slug}' already exists`,
        );
      }
    }
  }
}
