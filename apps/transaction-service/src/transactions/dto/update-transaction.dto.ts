import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Partial update — every field optional; only provided fields change. */
export class UpdateTransactionDto {
  @IsOptional()
  @IsIn(['income', 'expense'])
  type?: 'income' | 'expense';

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
