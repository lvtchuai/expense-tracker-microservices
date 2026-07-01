import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImportController } from './import/import.controller';
import { ImportService } from './import/import.service';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [ImportController, HealthController],
  providers: [ImportService],
})
export class ImportWorkerModule {}
