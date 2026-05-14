import { Controller, Get, Post, Param, ParseIntPipe, Query, Body, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto, CreateNotificationDto } from './dto/notification.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get('me') @ApiOperation({ summary: 'My notifications' })
  listMine(@Request() req: any, @Query() query: NotificationQueryDto) {
    return this.service.listMyNotifications(req.user.sub, query);
  }

  @Get('me/unread-count') @ApiOperation({ summary: 'Unread notification count' })
  unreadCount(@Request() req: any) {
    return this.service.getUnreadCount(req.user.sub);
  }

  @Post('me/:id/read') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.markAsRead(req.user.sub, id);
  }

  @Post('me/read-all') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@Request() req: any) {
    return this.service.markAllRead(req.user.sub);
  }

  @Get() @RequirePermissions('notification.retry.manage') @ApiOperation({ summary: 'List all notifications (admin)' })
  listAll(@Query() query: NotificationQueryDto) {
    return this.service.listAll(query);
  }

  @Post() @RequirePermissions('notification.template.manage') @ApiOperation({ summary: 'Create notification' })
  create(@Body() dto: CreateNotificationDto) {
    return this.service.create(dto);
  }
}
