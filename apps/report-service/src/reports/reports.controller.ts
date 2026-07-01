import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, JwtPayload } from '@app/common';
import { ReportsService } from './reports.service';
import { MonthlyQueryDto } from './dto/monthly-query.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** GET /api/reports/monthly?year=2026&month=7 */
  @Get('monthly')
  monthly(@CurrentUser() user: JwtPayload, @Query() q: MonthlyQueryDto) {
    return this.reports.monthly(user.sub, q.year, q.month);
  }
}
