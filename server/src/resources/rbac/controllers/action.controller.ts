import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Logger,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ActionService } from '../services/action.service';
import { CreateActionDto } from '../dto/action/create-action.dto';
import { Action } from '../entities/action.entity';
import { PaginationOptions } from 'src/common/interfaces/pagination';

@Controller('actions')
export class ActionController {
  private readonly logger = new Logger(ActionController.name);

  constructor(private readonly actionService: ActionService) {}

  @Post()
  async create(@Body() createActionDto: CreateActionDto): Promise<Action> {
    this.logger.log('Creating action', {
      action: 'CREATE_ACTION',
      data: createActionDto,
    });
    const action = await this.actionService.create(createActionDto);
    this.logger.log('Action created', {
      action: 'ACTION_CREATED',
      actionId: action.id,
    });
    return action;
  }

  @Get()
  async findAll(@Query() query: PaginationOptions): Promise<Action[]> {
    this.logger.log('Fetching actions', {
      action: 'GET_ACTIONS',
      filters: query,
    });
    return this.actionService.findAll(query);
  }

  // Specific routes BEFORE generic :id routes

  @Delete(':id/force')
  async forceDelete(@Param('id') id: string): Promise<Action> {
    this.logger.log('Force deleting action', {
      action: 'FORCE_DELETE_ACTION',
      actionId: id,
    });
    return this.actionService.permanentlyDeleteAction(id);
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string): Promise<Action> {
    this.logger.log('Restoring action', {
      action: 'RESTORE_ACTION',
      actionId: id,
    });
    return this.actionService.restoreAction(id);
  }

  // Generic :id routes come LAST

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Action> {
    this.logger.log('Fetching action by id', {
      action: 'GET_ACTION',
      actionId: id,
    });
    return this.actionService.findActionById(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<Action> {
    this.logger.log('Deleting action', {
      action: 'DELETE_ACTION',
      actionId: id,
    });
    return this.actionService.removeAction(id);
  }
}
