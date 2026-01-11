import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Public } from 'src/configuration/jwt/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ContactsService } from './contacts.service';
import { SelectionSessionService } from './selection-session.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactQueryDto } from './dto/contact-query.dto';
import { BulkUploadContactsDto } from './dto/bulk-upload-contacts.dto';
import {
  CreateSelectionSessionDto,
  UpdateSelectionDto,
} from './dto/selection-session.dto';
import { UserContextService } from 'src/common/services/user-context.service';

@Controller()
export class ContactsController {
  constructor(
    private readonly contactsService: ContactsService,
    private readonly selectionSessionService: SelectionSessionService,
    private readonly userContextService: UserContextService,
  ) {}

  @Post()
  create(@Body() createContactDto: CreateContactDto) {
    return this.contactsService.createContact(createContactDto);
  }

  @Get()
  findAll(@Query() query: ContactQueryDto) {
    return this.contactsService.findAll(query);
  }
  
  @Post('selection/session')
  createSelectionSession(@Body() createSessionDto: CreateSelectionSessionDto) {
    const userId = this.userContextService.getCurrentUserId();
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    return this.selectionSessionService.createSession(
      createSessionDto.listId,
      userId,
    );
  }

  @Get('selection/:sessionId/state')
  getSelectionState(@Param('sessionId') sessionId: string) {
    const userId = this.userContextService.getCurrentUserId();
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    return this.selectionSessionService.getSelectionState(sessionId, userId);
  }

  @Patch('selection/:sessionId')
  updateSelection(
    @Param('sessionId') sessionId: string,
    @Body() updateSelectionDto: UpdateSelectionDto,
  ) {
    const userId = this.userContextService.getCurrentUserId();
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    if (updateSelectionDto.operation === 'add') {
      return this.selectionSessionService.addContactsToSelection(
        sessionId,
        userId,
        updateSelectionDto.contactIds,
      );
    } else {
      return this.selectionSessionService.removeContactsFromSelection(
        sessionId,
        userId,
        updateSelectionDto.contactIds,
      );
    }
  }

  @Post('selection/:sessionId/apply')
  applySelection(@Param('sessionId') sessionId: string) {
    const userId = this.userContextService.getCurrentUserId();
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    return this.selectionSessionService.applySelection(sessionId, userId);
  }

  @Post('selection/:sessionId/reset')
  resetSelectionToOriginal(@Param('sessionId') sessionId: string) {
    const userId = this.userContextService.getCurrentUserId();
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }
    return this.selectionSessionService.resetSelectionToOriginal(
      sessionId,
      userId,
    );
  }

  @Patch(':id/unsubscribe')
  unsubscribe(@Param('id') id: string) {
    return this.contactsService.unsubscribeContact(id);
  }

  @Patch(':id/email-tracking/:type')
  updateEmailTracking(
    @Param('id') id: string,
    @Param('type') type: 'sent' | 'opened' | 'clicked',
  ) {
    return this.contactsService.updateEmailTracking(id, type);
  }

  @Patch(':id/bounce')
  incrementBounceCount(@Param('id') id: string) {
    return this.contactsService.incrementBounceCount(id);
  }

  @Patch(':id/complaint')
  incrementComplaintCount(@Param('id') id: string) {
    return this.contactsService.incrementComplaintCount(id);
  }

  @Delete(':id/force')
  forceDelete(@Param('id') id: string) {
    return this.contactsService.permanentlyDeleteContact(id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.contactsService.restoreContact(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
    return this.contactsService.updateContact(id, updateContactDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contactsService.removeContact(id);
  }

  @Post('bulk-upload-advanced')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUploadContactsAdvanced(
    @UploadedFile() file: any,
    @Query() query: BulkUploadContactsDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const result = await this.contactsService.bulkUploadContactsAdvanced(
      file,
      query.organizationId,
    );

    return result;
  }

  @Public()
  @Get('template')
  async downloadTemplate(@Res() res: Response) {
    try {
      const template = await this.contactsService.generateContactTemplate();

      res.setHeader(
        'Content-Type',
        'text/csv',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=contacts-import-template.csv',
      );

      res.send(template);
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate template: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @Get('upload-progress/:fileId')
  async getUploadProgress(@Param('fileId') fileId: string) {
    return this.contactsService.getUploadProgress(fileId);
  }

  @Delete('cancel-bulk-upload/:jobId')
  async cancelBulkUpload(@Param('jobId') jobId: string) {
    return this.contactsService.cancelBulkUpload(jobId);
  }
}
