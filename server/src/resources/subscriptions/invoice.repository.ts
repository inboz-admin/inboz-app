import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/common/repository/base.repository';
import { InjectModel } from '@nestjs/sequelize';
import { Invoice } from './entities/invoice.entity';
import { UserContextService } from 'src/common/services/user-context.service';

@Injectable()
export class InvoiceRepository extends BaseRepository<Invoice> {
  constructor(
    @InjectModel(Invoice)
    invoiceModel: typeof Invoice,
    userContextService: UserContextService,
  ) {
    super(invoiceModel, undefined, userContextService);
  }
}



























