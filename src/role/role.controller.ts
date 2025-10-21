import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/decorators/auth-user.decorator';
import type { PublicUser } from '../auth/decorators/auth-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoleService } from '../data-base/query/role/role.service';

@Controller('role')
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('request-update')
  async requestForUpdateRoles(@AuthUser() user: PublicUser) {
    return this.roleService.updateAdminUsers([user]);
  }
}
