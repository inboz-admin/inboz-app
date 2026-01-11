import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateActionDto } from '../dto/action/create-action.dto';
import { ActionRepository } from '../repositories/action.repository';
import { Action } from '../entities/action.entity';
import { PaginationOptions } from 'src/common/interfaces/pagination';
import { BaseService } from 'src/common/services/base.service';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class ActionService extends BaseService<Action> {
  constructor(
    private readonly actionRepository: ActionRepository,
    private readonly userContextService: UserContextService,
  ) {
    super(actionRepository);
  }

  async create(createActionDto: CreateActionDto): Promise<Action> {
    const existingAction = await this.actionRepository.findOne({
      where: { name: createActionDto.name },
    });

    if (existingAction) {
      throw new ConflictException(
        `Action with name ${createActionDto.name} already exists`,
      );
    }

    const currentUserId = this.userContextService.getCurrentUserId();
    return this.actionRepository.create(createActionDto, undefined, currentUserId);
  }

  async findAll(options?: PaginationOptions): Promise<Action[]> {
    const result = await this.actionRepository.findAll({
      pagination: {
        ...options,
        searchFields: ['name', 'description'],
      },
    });

    return result.data as Action[];
  }

  async findActionById(id: string): Promise<Action> {
    const action = await this.actionRepository.findById(id);
    if (!action) {
      throw new NotFoundException(`Action with ID ${id} not found`);
    }
    return action as Action;
  }

  async findByName(name: string): Promise<Action> {
    const action = await this.actionRepository.findOne({
      where: { name },
    });
    if (!action) {
      throw new NotFoundException(`Action with name ${name} not found`);
    }
    return action as Action;
  }

  // Soft delete action (default behavior)
  async removeAction(id: string): Promise<Action> {
    const action = await this.findActionById(id);
    await this.softDelete({ id }, undefined);
    return action;
  }

  // Force delete action (super admin only - permanent deletion)
  async permanentlyDeleteAction(id: string): Promise<Action> {
    const action = await this.findActionById(id);
    await this.hardDelete({ id }, undefined);
    return action;
  }

  // Restore soft deleted action
  async restoreAction(id: string): Promise<Action> {
    await this.restore({ id }, undefined);
    return this.findActionById(id);
  }
}
