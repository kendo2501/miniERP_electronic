import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermissions('auth.user.read')
  @ApiOperation({ summary: 'List all users (paginated)' })
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.findOne(user.id);
  }

  @Get('roles')
  @RequirePermissions('auth.user.read')
  @ApiOperation({ summary: 'Get all available roles' })
  getRoles() {
    return this.usersService.getAllRoles();
  }

  @Get(':id')
  @RequirePermissions('auth.user.read')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions('auth.user.create')
  @ApiOperation({ summary: 'Create a new user' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('auth.user.update')
  @ApiOperation({ summary: 'Update user profile' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Post(':id/lock')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('auth.user.lock')
  @ApiOperation({ summary: 'Lock a user account' })
  lock(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.lock(id);
  }

  @Post(':id/unlock')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('auth.user.lock')
  @ApiOperation({ summary: 'Unlock a user account' })
  unlock(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.unlock(id);
  }

  @Put(':id/roles')
  @RequirePermissions('auth.user.assign_roles')
  @ApiOperation({ summary: 'Replace all roles for a user' })
  @ApiBody({ schema: { properties: { roleIds: { type: 'array', items: { type: 'number' } } } } })
  assignRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body('roleIds') roleIds: number[],
  ) {
    return this.usersService.assignRoles(id, roleIds);
  }
}
