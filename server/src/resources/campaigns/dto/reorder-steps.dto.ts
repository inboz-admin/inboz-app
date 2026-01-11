import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class ReorderStepsDto {
  @IsNotEmpty()
  @IsArray()
  @IsUUID(undefined, { each: true })
  stepIdOrder: string[];
}



