import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, JwtPayload } from '@app/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { SettleDto } from './dto/settle.dto';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGroupDto) {
    return this.service.create(user, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.listForUser(user.sub);
  }

  @Get(':id')
  detail(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getDetail(user.sub, id);
  }

  @Post(':id/members')
  addMember(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.service.addMember(user.sub, id, dto.email);
  }

  @Post(':id/expenses')
  addExpense(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.service.addExpense(user.sub, id, dto);
  }

  /** Delete an expense OR a settle-up payment. */
  @Delete(':id/expenses/:entryId')
  deleteEntry(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.service.deleteEntry(user.sub, id, entryId);
  }

  /** Record a settle-up payment (from → to). */
  @Post(':id/settle')
  settle(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SettleDto,
  ) {
    return this.service.settle(user.sub, id, dto.from, dto.to, dto.amount);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.service.removeMember(user.sub, id, memberId);
  }

  @Delete(':id')
  deleteGroup(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deleteGroup(user.sub, id);
  }
}
