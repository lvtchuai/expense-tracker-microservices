import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  CurrentUser,
  JwtPayload,
  UserOrInternalGuard,
} from '@app/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';

@Controller('transactions')
@UseGuards(UserOrInternalGuard)
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.service.create(user.sub, dto);
  }

  /**
   * Async CSV import. Accepts raw CSV in the body (text/csv), parses it, and
   * enqueues one message per row for import-worker. Returns immediately —
   * the actual transaction creation happens in the worker.
   * Body format per row: type,amount,category,occurredAt[,note]
   */
  @Post('import')
  import(@CurrentUser() user: JwtPayload, @Req() req: Request) {
    const csv = typeof req.body === 'string' ? req.body : '';
    return this.service.enqueueImport(user.sub, csv);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryTransactionDto,
  ) {
    return this.service.findAll(user.sub, query);
  }

  @Get('summary')
  summary(@CurrentUser() user: JwtPayload) {
    return this.service.summary(user.sub);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(user.sub, id);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(user.sub, id);
  }
}
