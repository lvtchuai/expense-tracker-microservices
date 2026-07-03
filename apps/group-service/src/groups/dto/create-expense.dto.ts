import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  /** userId of the payer; must be a group member. */
  @IsUUID()
  paidBy: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsString()
  @MaxLength(140)
  description: string;

  /** userIds to split evenly across; all must be group members. */
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  participantIds: string[];

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
