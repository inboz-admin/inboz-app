import { IsString, IsArray, IsEnum, IsOptional } from 'class-validator';

export class CreateSelectionSessionDto {
  @IsString()
  listId: string;
}

export class UpdateSelectionDto {
  @IsArray()
  @IsString({ each: true })
  contactIds: string[];

  @IsEnum(['add', 'remove'])
  operation: 'add' | 'remove';
}

export class SelectionStateResponseDto {
  sessionId: string;
  totalSelected: number;
  baseCount: number;
  addedCount: number;
  removedCount: number;
  currentSelection: string[];
}

export class ApplyResultResponseDto {
  addedCount: number;
  removedCount: number;
  finalCount: number;
}

export class ContactWithSelectionStatusDto {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  status: string;
  createdAt: Date;
  isInOriginalList: boolean;
  isSelected: boolean;
}

export class ContactsWithSelectionResponseDto {
  data: ContactWithSelectionStatusDto[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
  };
  selectionInfo?: SelectionStateResponseDto;
}
