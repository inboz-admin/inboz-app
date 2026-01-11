import { IsArray, IsString, IsNotEmpty, ArrayMinSize } from 'class-validator';

export class AddContactsToListDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  contactIds: string[];
}

export class RemoveContactsFromListDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  contactIds: string[];
}
