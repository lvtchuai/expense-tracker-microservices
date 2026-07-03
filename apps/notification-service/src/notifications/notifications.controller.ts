import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, JwtPayload } from '@app/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    return this.service.list(user.sub, limit ? Number(limit) : 20);
  }

  @Get('unread-count')
  async unread(@CurrentUser() user: JwtPayload) {
    return { count: await this.service.unreadCount(user.sub) };
  }

  @Patch('read-all')
  readAll(@CurrentUser() user: JwtPayload) {
    return this.service.markAllRead(user.sub);
  }

  @Patch(':id/read')
  read(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.markRead(user.sub, id);
  }
}
