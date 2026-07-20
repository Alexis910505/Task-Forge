import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import { Roles } from '../../core/decorators/roles.decorator';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  me(@Req() req: Request & { user: RequestUser }) {
    return this.users.findMe(req.user.organizationId, req.user.userId);
  }

  @Get('me/profile')
  @ApiOperation({ summary: 'Panel de perfil con métricas y tareas activas' })
  myProfile(@Req() req: Request & { user: RequestUser }) {
    return this.users.getMyProfile(req.user.organizationId, req.user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualizar nombre del perfil propio' })
  updateMe(@Req() req: Request & { user: RequestUser }, @Body() dto: UpdateProfileDto) {
    return this.users.updateMe(req.user.organizationId, req.user.userId, dto);
  }

  @Get('roles')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Listar roles de la organización' })
  roles(@Req() req: Request & { user: RequestUser }) {
    return this.users.listRoles(req.user.organizationId);
  }

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Listar usuarios' })
  findAll(@Req() req: Request & { user: RequestUser }) {
    return this.users.findAll(req.user.organizationId);
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Detalle de usuario' })
  findOne(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    return this.users.findOne(req.user.organizationId, id);
  }

  @Post()
  @Roles('ADMIN')
  @RequirePermissions('users:write')
  @ApiOperation({ summary: 'Crear usuario (solo administrador)' })
  create(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateUserDto) {
    return this.users.create(req.user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions('users:write')
  @ApiOperation({ summary: 'Actualizar usuario (correo/contraseña solo administrador)' })
  update(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(req.user.organizationId, id, dto, {
      userId: req.user.userId,
      role: req.user.role,
    });
  }

  @Delete(':id')
  @RequirePermissions('users:write')
  @ApiOperation({ summary: 'Eliminar usuario' })
  remove(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    return this.users.remove(req.user.organizationId, id, {
      userId: req.user.userId,
      role: req.user.role,
    });
  }
}
