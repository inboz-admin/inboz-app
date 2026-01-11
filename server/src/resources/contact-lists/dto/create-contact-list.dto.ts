import {
  IsString,
  IsOptional,
  IsObject,
  IsNotEmpty,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { FilterConditions } from './filter-conditions.interface';
import { ContactListType } from '../enums/contact-list-type.enum';

export class CreateContactListDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return value;
  })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  filterConditions?: FilterConditions;

  @IsEnum(ContactListType)
  @IsOptional()
  type?: ContactListType = ContactListType.PRIVATE;

  @IsString()
  @IsOptional()
  organizationId?: string;
}
