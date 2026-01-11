import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceQueryDto } from './dto/query.dto';
import { InvoiceRepository } from './invoice.repository';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { BaseService } from 'src/common/services/base.service';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { Organization } from 'src/resources/organizations/entities/organization.entity';
import { v4 as uuidv4 } from 'uuid';
import { DateNormalizationService } from './services/date-normalization.service';
import { InvoicePdfService } from './services/invoice-pdf.service';

@Injectable()
export class InvoicesService extends BaseService<Invoice> {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    @InjectModel(Invoice)
    private readonly invoiceModel: typeof Invoice,
    @InjectModel(Subscription)
    private readonly subscriptionModel: typeof Subscription,
    @InjectModel(Organization)
    private readonly organizationModel: typeof Organization,
    private readonly dateNormalizationService: DateNormalizationService,
    private readonly invoicePdfService: InvoicePdfService,
  ) {
    super(invoiceRepository);
  }

  async createInvoice(createInvoiceDto: CreateInvoiceDto, transaction?: any): Promise<Invoice> {
    // Verify organization exists
    const organization = await this.organizationModel.findByPk(
      createInvoiceDto.organizationId,
      { transaction },
    );
    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${createInvoiceDto.organizationId} not found`,
      );
    }

    // Verify subscription exists if provided
    if (createInvoiceDto.subscriptionId) {
      const subscription = await this.subscriptionModel.findByPk(
        createInvoiceDto.subscriptionId,
        { transaction },
      );
      if (!subscription) {
        throw new NotFoundException(
          `Subscription with ID ${createInvoiceDto.subscriptionId} not found`,
        );
      }
    }

    // Check if invoice number already exists (within transaction to prevent duplicates)
    const existingInvoice = await this.invoiceRepository.findOne({
      where: { invoiceNumber: createInvoiceDto.invoiceNumber },
      transaction,
    });

    if (existingInvoice) {
      throw new BadRequestException(
        `Invoice with number ${createInvoiceDto.invoiceNumber} already exists`,
      );
    }

    // Convert date strings to Date objects for Sequelize
    const invoiceData = this.dateNormalizationService.normalizeDateFields(
      { ...createInvoiceDto },
      ['issueDate', 'dueDate', 'paidAt', 'pdfGeneratedAt'],
    ) as any;

    const invoice = await this.invoiceRepository.create(
      invoiceData,
      transaction,
    );

    return invoice;
  }

  async findAll(query?: InvoiceQueryDto) {
    const whereConditions: any = {};

    if (query?.organizationId) {
      whereConditions.organizationId = query.organizationId;
    }

    if (query?.subscriptionId) {
      whereConditions.subscriptionId = query.subscriptionId;
    }

    if (query?.status) {
      whereConditions.status = query.status;
    }

    return this.invoiceRepository.findAll({
      where: whereConditions,
      include: [
        {
          model: Subscription,
          as: 'subscription',
        },
        {
          model: Organization,
          as: 'organization',
        },
      ],
      pagination: {
        page: query?.page ? parseInt(query.page) : 1,
        limit: query?.limit ? parseInt(query.limit) : 10,
        searchTerm: query?.search || '',
        searchFields: ['invoiceNumber'],
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      },
    });
  }

  async findInvoiceById(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
    return invoice as Invoice;
  }

  async updateInvoice(
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    // Convert date strings to Date objects for Sequelize
    const updateData = this.dateNormalizationService.normalizeDateFields(
      { ...updateInvoiceDto },
      ['issueDate', 'dueDate', 'paidAt', 'pdfGeneratedAt'],
    ) as any;

    const affectedCount = await this.invoiceRepository.update(
      { id },
      updateData,
      undefined,
    );

    if (affectedCount === 0) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return this.findInvoiceById(id);
  }

  async markInvoiceAsPaid(id: string): Promise<Invoice> {
    const invoice = await this.findInvoiceById(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice is already paid');
    }

    const affectedCount = await this.invoiceRepository.update(
      { id },
      {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
        amountPaid: invoice.total,
        amountDue: 0,
      },
      undefined,
    );

    if (affectedCount === 0) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return this.findInvoiceById(id);
  }

  async removeInvoice(id: string): Promise<Invoice> {
    const invoice = await this.findInvoiceById(id);
    await this.softDelete({ id }, undefined);
    return invoice;
  }

  async getBillingHistory(organizationId: string): Promise<Invoice[]> {
    const result = await this.invoiceRepository.findAll({
      where: { organizationId },
      include: [
        {
          model: this.subscriptionModel,
          as: 'subscription',
        },
      ],
      pagination: {
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      },
    });

    return result.data as Invoice[] || [];
  }

  async generateInvoiceNumber(transaction?: Transaction): Promise<string> {
    // Generate invoice number using only milliseconds timestamp
    const timestamp = Date.now();
    return `INV-${timestamp}`;
  }

  /**
   * Generate PDF invoice with standard invoice structure
   */
  async generateInvoicePdf(invoiceId: string): Promise<Buffer> {
    const invoice = await this.findInvoiceById(invoiceId);
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    // Load invoice with relations
    const fullInvoiceRaw = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      include: [
        { model: Organization, as: 'organization' },
        {
          model: Subscription,
          as: 'subscription',
          include: [
            {
              model: SubscriptionPlan,
              as: 'plan',
            },
          ],
        },
      ],
    });

    if (!fullInvoiceRaw) {
      throw new NotFoundException(`Invoice with ID ${invoiceId} not found`);
    }

    // Type assertion for invoice with relations
    const fullInvoice = fullInvoiceRaw as any as Invoice & {
      organization?: Organization;
      subscription?: Subscription & { plan?: SubscriptionPlan };
    };

    return this.invoicePdfService.generatePdf(fullInvoice);
  }
}

