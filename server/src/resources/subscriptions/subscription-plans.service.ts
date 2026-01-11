import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscriptionPlanQueryDto } from './dto/query.dto';
import { SubscriptionPlanRepository } from './subscription-plan.repository';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { BaseService } from 'src/common/services/base.service';

@Injectable()
export class SubscriptionPlansService extends BaseService<SubscriptionPlan> {
  private readonly logger = new Logger(SubscriptionPlansService.name);

  constructor(
    private readonly subscriptionPlanRepository: SubscriptionPlanRepository,
  ) {
    super(subscriptionPlanRepository);
  }

  async createSubscriptionPlan(
    createSubscriptionPlanDto: CreateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    // Check if plan with same name already exists
    const existingPlan = await this.subscriptionPlanRepository.findOne({
      where: { name: createSubscriptionPlanDto.name },
    });

    if (existingPlan) {
      throw new ConflictException(
        `Subscription plan with name ${createSubscriptionPlanDto.name} already exists`,
      );
    }

    const subscriptionPlan = await this.subscriptionPlanRepository.create(
      createSubscriptionPlanDto,
      undefined,
    );

    return subscriptionPlan;
  }

  async findAll(query?: SubscriptionPlanQueryDto) {
    const whereConditions: any = {};

    if (query?.isActive !== undefined) {
      whereConditions.isActive = query.isActive;
    }

    if (query?.isPublic !== undefined) {
      whereConditions.isPublic = query.isPublic;
    }

    return this.subscriptionPlanRepository.findAll({
      where: whereConditions,
      pagination: {
        page: query?.page ? parseInt(query.page) : 1,
        limit: query?.limit ? parseInt(query.limit) : 10,
        searchTerm: query?.search || '',
        searchFields: ['name', 'description'],
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      },
    });
  }

  async findSubscriptionPlanById(id: string): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanRepository.findById(id);
    if (!plan) {
      throw new NotFoundException(`Subscription plan with ID ${id} not found`);
    }
    return plan as SubscriptionPlan;
  }

  async findSubscriptionPlanByName(name: string): Promise<SubscriptionPlan | null> {
    const plan = await this.subscriptionPlanRepository.findOne({
      where: { name },
    });
    return plan as SubscriptionPlan | null;
  }

  async updateSubscriptionPlan(
    id: string,
    updateSubscriptionPlanDto: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    // Check if trying to update name and it conflicts with existing plan
    if (updateSubscriptionPlanDto.name) {
      const plan = await this.findSubscriptionPlanById(id);
      const existingPlan = await this.subscriptionPlanRepository.findOne({
        where: { name: updateSubscriptionPlanDto.name },
      });

      if (existingPlan && (existingPlan as SubscriptionPlan).id !== id) {
        throw new ConflictException(
          `Subscription plan with name ${updateSubscriptionPlanDto.name} already exists`,
        );
      }
    }

    const affectedCount = await this.subscriptionPlanRepository.update(
      { id },
      updateSubscriptionPlanDto,
      undefined,
    );

    if (affectedCount === 0) {
      throw new NotFoundException(
        `Subscription plan with ID ${id} not found`,
      );
    }

    return this.findSubscriptionPlanById(id);
  }

  async removeSubscriptionPlan(id: string): Promise<SubscriptionPlan> {
    const plan = await this.findSubscriptionPlanById(id);
    await this.softDelete({ id }, undefined);
    return plan;
  }

  async permanentlyDeleteSubscriptionPlan(id: string): Promise<SubscriptionPlan> {
    const plan = await this.findSubscriptionPlanById(id);
    await this.hardDelete({ id }, undefined);
    return plan;
  }

  async restoreSubscriptionPlan(id: string) {
    await this.restore({ id }, undefined);
    return this.findSubscriptionPlanById(id);
  }

  async getActivePublicPlans(): Promise<SubscriptionPlan[]> {
    const result = await this.subscriptionPlanRepository.findAll({
      where: { isActive: true, isPublic: true },
    });
    // Handle both array and paginated response
    if (Array.isArray(result)) {
      return result;
    }
    // If it's a paginated response, return the data array
    return (result as any).data || [];
  }
}

