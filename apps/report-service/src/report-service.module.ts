import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { HealthController } from './health.controller';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { TransactionsClient } from './reports/transactions.client';
import { JwtStrategy } from './auth/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,
  ],
  controllers: [ReportsController, HealthController],
  providers: [ReportsService, TransactionsClient, JwtStrategy],
})
export class ReportServiceModule {}
