import { Controller, Get, Patch, Param, Query, Body, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { SettingsQueryDto, UpdateSettingDto } from './dto/settings.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private service: SettingsService) {}

  @Get() @RequirePermissions('settings.manage') @ApiOperation({ summary: 'List settings' })
  listSettings(@Query() query: SettingsQueryDto) { return this.service.listSettings(query); }

  @Get('categories') @RequirePermissions('settings.manage') @ApiOperation({ summary: 'List setting categories' })
  getCategories() { return this.service.getCategories(); }

  @Get(':key') @RequirePermissions('settings.manage') @ApiOperation({ summary: 'Get setting by key' })
  getSetting(@Param('key') key: string) { return this.service.getSetting(key); }

  @Patch(':key') @RequirePermissions('settings.manage') @ApiOperation({ summary: 'Update setting value' })
  updateSetting(@Param('key') key: string, @Body() dto: UpdateSettingDto, @Request() req: any) {
    return this.service.updateSetting(key, dto, req.user.sub);
  }
}
