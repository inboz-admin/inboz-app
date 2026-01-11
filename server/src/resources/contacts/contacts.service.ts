import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactQueryDto } from './dto/contact-query.dto';
import { ContactRepository } from './contacts.repository';
import { Contact, ContactStatus } from './entities/contact.entity';
import { BaseService } from 'src/common/services/base.service';
import { ExcelService } from 'src/configuration/excel/excel.service';
import { MulterService } from 'src/configuration/multer/multer.service';
import { SimpleBulkUploadService } from './simple-bulk-upload.service';
import { ContactBulkUploadQueue } from 'src/configuration/bull/queues/contact-bulk-upload.queue';
import { ContactListMember } from 'src/resources/contact-lists/entities/contact-list-member.entity';
import { InjectModel } from '@nestjs/sequelize';
import { ContactListsService } from 'src/resources/contact-lists/contact-lists.service';
import { UserContextService } from 'src/common/services/user-context.service';
import { TransactionManager } from 'src/common/services/transaction-manager.service';
import {
  BOUNCE_THRESHOLD,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  CONTACT_SEARCH_FIELDS,
  MAX_ROWS_PER_BULK_UPLOAD,
} from './contacts.constants';
import { Op } from 'sequelize';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ContactsService extends BaseService<Contact> implements OnModuleInit {
  private readonly logger = new Logger(ContactsService.name);
  private readonly bulkUploadDir = path.join(process.cwd(), 'uploads', 'contacts', 'bulk-upload');
  
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly excelService: ExcelService,
    private readonly multerService: MulterService,
    private readonly contactBulkUploadQueue: ContactBulkUploadQueue,
    private readonly userContextService: UserContextService,
    private readonly transactionManager: TransactionManager,
    @InjectModel(ContactListMember)
    private readonly contactListMemberModel: typeof ContactListMember,
    @Inject(forwardRef(() => ContactListsService))
    private readonly contactListsService: ContactListsService,
  ) {
    super(contactRepository);
  }

  async onModuleInit() {
    this.logger.log('ContactsService initialized, checking for orphaned upload files...');
    await this.recoverOrphanedFiles();
  }

  async recoverOrphanedFiles(): Promise<{
    found: number;
    cleaned: number;
    requeued: number;
    errors: number;
  }> {
    const stats = {
      found: 0,
      cleaned: 0,
      requeued: 0,
      errors: 0,
    };

    try {
      if (!fs.existsSync(this.bulkUploadDir)) {
        this.logger.log('Bulk upload directory does not exist, skipping recovery');
        return stats;
      }

      const files = fs.readdirSync(this.bulkUploadDir);
      this.logger.log(`Found ${files.length} files in bulk upload directory`);

      for (const file of files) {
        if (!file.endsWith('.csv')) {
          continue;
        }

        stats.found++;
        const filePath = path.join(this.bulkUploadDir, file);
        const fileId = path.basename(file, '.csv');

        try {
          const fileStats = fs.statSync(filePath);
          const fileAge = Date.now() - fileStats.mtimeMs;
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours

          try {
            const jobStatus = await this.contactBulkUploadQueue.getJobStatus(fileId);
            
            if (jobStatus && (jobStatus.state === 'completed' || jobStatus.state === 'failed')) {
              this.logger.log(`File ${fileId} has completed/failed job, cleaning up`);
              fs.unlinkSync(filePath);
              stats.cleaned++;
              continue;
            }

            if (jobStatus && (jobStatus.state === 'waiting' || jobStatus.state === 'active')) {
              this.logger.log(`File ${fileId} has active job, skipping`);
              continue;
            }
          } catch (error) {
            this.logger.warn(`Could not check job status for ${fileId}, assuming orphaned`);
          }

          if (fileAge > maxAge) {
            this.logger.log(`File ${fileId} is older than 24 hours, cleaning up`);
            fs.unlinkSync(filePath);
            stats.cleaned++;
          } else {
            this.logger.warn(
              `Found orphaned file ${fileId} (age: ${Math.round(fileAge / 1000 / 60)} minutes). File cleanup recommended.`,
            );
          }
        } catch (error) {
          this.logger.error(`Error processing orphaned file ${fileId}:`, error);
          stats.errors++;
        }
      }

      if (stats.found > 0) {
        this.logger.log(
          `Orphaned file recovery complete: Found ${stats.found}, Cleaned ${stats.cleaned}, Requeued ${stats.requeued}, Errors ${stats.errors}`,
        );
      }
    } catch (error) {
      this.logger.error('Error during orphaned file recovery:', error);
      stats.errors++;
    }

    return stats;
  }

  private async validateEmailUniqueness(
    email: string,
    organizationId: string,
    excludeId?: string,
    transaction?: any,
  ): Promise<void> {
    const where: any = {
      email,
      organizationId,
    };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    const existing = await this.contactRepository.findOne({ where, transaction });
    if (existing) {
      throw new ConflictException(
        `Contact with email ${email} already exists in this organization`,
      );
    }
  }

  private async deleteContactWithCleanup(
    id: string,
    hardDelete: boolean = false,
  ): Promise<Contact> {
    const contact = await this.findContactById(id);

    await this.transactionManager.execute(async (tx) => {
      const listIds = await this.contactListsService.getListsContainingContact(id);

      await this.contactListMemberModel.destroy({
        where: { contactId: id },
        transaction: tx,
      });

      if (listIds.length > 0) {
        await this.contactListsService.updateContactCounts(listIds, tx);
      }

      if (hardDelete) {
        await this.hardDelete({ id }, tx);
      } else {
        await this.softDelete({ id }, tx);
      }
    });

    return contact;
  }

  async createContact(createContactDto: CreateContactDto): Promise<Contact> {
    return await this.transactionManager.execute(async (tx) => {
      // Validate email uniqueness within transaction
      await this.validateEmailUniqueness(
        createContactDto.email,
        createContactDto.organizationId,
        undefined,
        tx,
      );

      const subscribed = createContactDto.subscribed !== undefined
        ? createContactDto.subscribed
        : true;
      
      const contactData: any = {
        ...createContactDto,
        status: createContactDto.status || ContactStatus.ACTIVE,
        subscribed,
        subscribedAt: subscribed ? new Date() : undefined,
      };

      const currentUserId = this.userContextService.getCurrentUserId();
      const newContact = await this.contactRepository.create(
        contactData,
        tx,
        currentUserId,
      );

      return newContact;
    });
  }

  async findAll(query?: ContactQueryDto) {
    const whereConditions: any = {};

    if (query?.status) {
      whereConditions.status = query.status;
    }

    if (query?.source) {
      whereConditions.source = query.source;
    }

    if (query?.company) {
      whereConditions.company = query.company;
    }

    if (query?.subscribed !== undefined) {
      whereConditions.subscribed = query.subscribed;
    }

    // Don't put organizationId in whereConditions - pass via RepositoryOptions.organizationId
    // so BaseRepository.applyTenantFilter() can handle it properly for employees

    return this.contactRepository.findAll({
      where: whereConditions,
      organizationId: query?.organizationId, // Pass via RepositoryOptions for employee filtering
      pagination: {
        page: query?.page || 1,
        limit: query?.limit || 10,
        searchTerm: query?.search || '',
        searchFields: CONTACT_SEARCH_FIELDS as any,
        sortBy: 'createdAt',
        sortOrder: query?.sortOrder || 'DESC',
      },
    });
  }

  async findContactById(id: string): Promise<Contact> {
    const contact = await this.contactRepository.findById(id);
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact as Contact;
  }

  async findByEmail(email: string, organizationId: string): Promise<Contact> {
    const contact = await this.contactRepository.findOne({
      where: { email, organizationId },
    });
    if (!contact) {
      throw new NotFoundException(
        `Contact with email ${email} not found in this organization`,
      );
    }
    return contact as Contact;
  }

  async updateContact(
    id: string,
    updateContactDto: UpdateContactDto,
  ): Promise<Contact> {
    const existingContact = await this.findContactById(id);

    return await this.transactionManager.execute(async (tx) => {
      // Validate email uniqueness within transaction if email is being updated
      if (updateContactDto.email) {
        await this.validateEmailUniqueness(
          updateContactDto.email,
          existingContact.organizationId,
          id,
          tx,
        );
      }

      const updateData: any = { ...updateContactDto };
      if (updateContactDto.subscribed !== undefined) {
        if (updateContactDto.subscribed) {
          updateData.subscribedAt = new Date();
          updateData.unsubscribedAt = null;
        } else {
          updateData.unsubscribedAt = new Date();
        }
      }

      const affectedCount = await this.contactRepository.update(
        { id },
        updateData,
        tx,
      );

      if (affectedCount === 0) {
        throw new NotFoundException(`Contact with ID ${id} not found`);
      }

      const updatedContact = await this.contactRepository.findById(id, tx);
      if (!updatedContact) {
        throw new NotFoundException(`Contact with ID ${id} not found`);
      }
      return updatedContact as Contact;
    });
  }

  async removeContact(id: string): Promise<Contact> {
    return this.deleteContactWithCleanup(id, false);
  }

  async permanentlyDeleteContact(id: string): Promise<Contact> {
    return this.deleteContactWithCleanup(id, true);
  }

  async restoreContact(id: string) {
    await this.restore({ id }, undefined);
    return this.findContactById(id);
  }

  async updateEmailTracking(
    contactId: string,
    trackingType: 'sent' | 'opened' | 'clicked',
  ): Promise<void> {
    const updateData: Partial<Contact> = {};

    switch (trackingType) {
      case 'sent':
        updateData.lastEmailSentAt = new Date();
        break;
      case 'opened':
        updateData.lastEmailOpenedAt = new Date();
        break;
      case 'clicked':
        updateData.lastEmailClickedAt = new Date();
        break;
    }

    const affectedCount = await this.contactRepository.update(
      { id: contactId },
      updateData,
      undefined,
    );

    if (affectedCount === 0) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }
  }

  async incrementBounceCount(contactId: string): Promise<void> {
    const sequelize = this.contactRepository['model'].sequelize;
    const { literal } = sequelize;

    await this.transactionManager.execute(async (tx) => {
      const [affectedCount] = await this.contactRepository['model'].update(
        {
          bounceCount: literal('bounce_count + 1'),
          status: literal(
            `CASE WHEN bounce_count + 1 >= ${BOUNCE_THRESHOLD} THEN '${ContactStatus.BOUNCED}' ELSE status END`,
          ),
        },
        {
          where: { id: contactId },
          transaction: tx,
        },
      );

      if (affectedCount === 0) {
        throw new NotFoundException(`Contact with ID ${contactId} not found`);
      }
    });
  }

  async incrementComplaintCount(contactId: string): Promise<void> {
    const sequelize = this.contactRepository['model'].sequelize;
    const { literal } = sequelize;

    await this.transactionManager.execute(async (tx) => {
      const [affectedCount] = await this.contactRepository['model'].update(
        {
          complaintCount: literal('complaint_count + 1'),
          status: literal(`'${ContactStatus.COMPLAINED}'`),
        },
        {
          where: { id: contactId },
          transaction: tx,
        },
      );

      if (affectedCount === 0) {
        throw new NotFoundException(`Contact with ID ${contactId} not found`);
      }
    });
  }

  async unsubscribeContact(contactId: string): Promise<Contact> {
    const updateData: Partial<Contact> = {
      subscribed: false,
      unsubscribedAt: new Date(),
      status: ContactStatus.UNSUBSCRIBED,
    };

    const affectedCount = await this.contactRepository.update(
      { id: contactId },
      updateData,
      undefined,
    );

    if (affectedCount === 0) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    return this.findContactById(contactId);
  }

  async generateContactTemplate(): Promise<Buffer> {
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'List',
      'Company',
      'Job Title',
      'Phone',
      'Source',
      'Timezone',
      'City',
      'State',
      'Country',
      'Department',
      'Industry',
      'Experience',
      'LinkedIn',
      'Twitter',
      'Facebook',
      'Website',
      'Company Domain',
      'Company Website',
      'Company Industry',
      'Company Size',
      'Company Revenue',
      'Personal Notes',
    ];

    return this.excelService.createCSVTemplate(headers);
  }

  async bulkUploadContactsAdvanced(
    file: any,
    organizationId?: string,
  ): Promise<{
    success: boolean;
    fileId: string;
    jobId: string;
    message: string;
  }> {
    this.logger.log('Starting advanced bulk upload process', {
      filename: file?.originalname,
      size: file?.size,
      organizationId,
    });

    try {
      if (!organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      const fileId = uuidv4();
      const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || 'csv';
      const storedFile = await this.multerService.processUpload(file, {
        fieldName: 'file',
        fileType: 'document' as any,
        maxFileSize: MAX_FILE_SIZE_BYTES,
        allowedExtensions: ALLOWED_FILE_EXTENSIONS,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
        customPath: 'contacts/bulk-upload',
        filename: `${fileId}.${fileExtension}`,
      });

      if (!storedFile.success) {
        throw new BadRequestException('Failed to store file');
      }

      // Pre-validate: Count rows in CSV file to check max rows limit
      // Read file from stored path to count rows
      const filePath = storedFile.files[0].path;
      let estimatedContactCount = 0;
      try {
        if (fs.existsSync(filePath)) {
          const csvContent = fs.readFileSync(filePath, 'utf-8');
          const lines = csvContent.split('\n').filter((line) => line.trim());
          // Subtract 1 for header row, count data rows
          estimatedContactCount = Math.max(0, lines.length - 1);

          // Validate max rows limit (10k rows)
          if (estimatedContactCount > MAX_ROWS_PER_BULK_UPLOAD) {
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
              } catch (unlinkError) {
                this.logger.error(`Failed to cleanup file ${filePath}:`, unlinkError);
              }
            }
            throw new BadRequestException(
              `File contains ${estimatedContactCount} rows. Maximum ${MAX_ROWS_PER_BULK_UPLOAD} rows allowed per upload.`,
            );
          }

          if (estimatedContactCount === 0) {
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
              } catch (unlinkError) {
                this.logger.error(`Failed to cleanup file ${filePath}:`, unlinkError);
              }
            }
            throw new BadRequestException('File contains no data rows. Please ensure the file has at least one contact row.');
          }
        }
      } catch (error) {
        // If pre-validation fails, clean up stored file and throw error
        if (error instanceof BadRequestException) {
          throw error;
        }
        this.logger.error('Failed to validate file rows', error);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (unlinkError) {
            this.logger.error(`Failed to cleanup file ${filePath}:`, unlinkError);
          }
        }
        throw new BadRequestException(
          `Failed to validate file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      const jobId = `job_${fileId}`;
      const currentUserId = this.userContextService.getCurrentUserId();

      try {
        const queueResult = await this.contactBulkUploadQueue.addBulkUploadJobWithRetry(
          fileId,
          filePath,
          organizationId,
          currentUserId,
        );
        return {
          success: true,
          fileId,
          jobId: queueResult.jobId,
          message: 'File uploaded successfully and queued for processing',
        };
      } catch (queueError) {
        this.logger.error('Failed to queue bulk upload job, cleaning up uploaded file', queueError);
        
        if (filePath && fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            this.logger.log(`Cleaned up orphaned file: ${filePath}`);
          } catch (unlinkError) {
            this.logger.error(`Failed to cleanup file ${filePath}:`, unlinkError);
          }
        }
        
        throw new BadRequestException(
          `Failed to queue bulk upload job: ${queueError instanceof Error ? queueError.message : 'Unknown error'}. File has been cleaned up.`,
        );
      }
    } catch (error) {
      this.logger.error('Advanced bulk upload failed', error);
      throw new BadRequestException(
        `Advanced bulk upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getUploadProgress(fileId: string): Promise<any> {
    try {
      return await this.contactBulkUploadQueue.getJobStatus(fileId);
    } catch (error) {
      this.logger.warn(`Failed to get upload progress for fileId ${fileId}:`, error);
      return null;
    }
  }

  async cancelBulkUpload(jobId: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Cancelling bulk upload job: ${jobId}`);
      await this.contactBulkUploadQueue.removeJob(jobId);
      
      this.logger.log(`Successfully cancelled job: ${jobId}`);
      
      return {
        success: true,
        message: 'Bulk upload cancelled successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to cancel job ${jobId}`, error);
      
      return {
        success: false,
        message: 'Failed to cancel bulk upload. Job may have already completed or failed.',
      };
    }
  }

}
