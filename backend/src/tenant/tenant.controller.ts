import { Controller, Post, Get, Patch, Body, Query, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantService } from './tenant.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Tenant')
@Controller('tenant/users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @Roles('ADMIN')
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @ApiOperation({ summary: '创建教师账号（返回临时密码，仅此一次可见）' })
  create(@Req() req: { user: { id: string; tenantId: string } }, @Body() dto: CreateUserDto) {
    return this.tenantService.createUser(req.user.tenantId, req.user.id, dto.name, dto.email);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: '用户列表（分页+搜索+角色筛选）' })
  list(
    @Req() req: { user: { tenantId: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.tenantService.listUsers(req.user.tenantId, {
      page: parseInt(page ?? '1'),
      limit: parseInt(limit ?? '20'),
      search,
      role,
    });
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: '启用/禁用用户' })
  toggle(
    @Req() req: { user: { id: string; tenantId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.tenantService.toggleUser(req.user.tenantId, id, req.user.id, dto.action);
  }
}
