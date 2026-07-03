import { IsNumber, IsUUID, Min } from 'class-validator';

/** Records a settle-up payment: `from` paid `to` an `amount`. */
export class SettleDto {
  @IsUUID()
  from: string;

  @IsUUID()
  to: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;
}
