import { PartialType } from '@nestjs/mapped-types';
import { CreateContactListDto } from './create-contact-list.dto';

export class UpdateContactListDto extends PartialType(CreateContactListDto) {}
