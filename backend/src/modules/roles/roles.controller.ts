import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import { Roles } from '../../core/decorators/roles.decorator';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('permissions')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Catálogo de permisos disponibles' })
  listPermissions() {
    return this.roles.listPermissions();
  }

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Listar roles de la organización' })
  findAll(@Req() req: Request & { user: RequestUser }) {
    return this.roles.findAll(req.user.organizationId);
  }

  @Post()
  @Roles('ADMIN')
  @RequirePermissions('users:write')
  @ApiOperation({ summary: 'Crear rol custom (solo administrador)' })
  create(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateRoleDto) {
    return this.roles.create(req.user.organizationId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @RequirePermissions('users:write')
  @ApiOperation({ summary: 'Actualizar nombre o permisos del rol (solo administrador)' })
  update(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roles.update(req.user.organizationId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @RequirePermissions('users:write')
  @ApiOperation({ summary: 'Eliminar rol sin usuarios, excepto ADMIN (solo administrador)' })
  remove(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    return this.roles.remove(req.user.organizationId, id);
  }
}
