import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';

@ApiTags('teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  @RequirePermissions('teams:read')
  @ApiOperation({ summary: 'Listar equipos' })
  findAll(@Req() req: Request & { user: RequestUser }) {
    return this.teams.findAll(req.user.organizationId);
  }

  @Post()
  @RequirePermissions('teams:write')
  @ApiOperation({ summary: 'Crear equipo' })
  create(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateTeamDto) {
    return this.teams.create(req.user.organizationId, dto);
  }

  @Patch(':id')
  @RequirePermissions('teams:write')
  @ApiOperation({ summary: 'Actualizar equipo' })
  update(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: Partial<CreateTeamDto>,
  ) {
    return this.teams.update(req.user.organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('teams:write')
  @ApiOperation({ summary: 'Eliminar equipo' })
  remove(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    return this.teams.remove(req.user.organizationId, id);
  }

  @Post(':id/members')
  @RequirePermissions('teams:write')
  @ApiOperation({ summary: 'Añadir miembro al equipo' })
  addMember(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: AddTeamMemberDto,
  ) {
    return this.teams.addMember(req.user.organizationId, id, dto.userId);
  }

  @Delete(':id/members/:userId')
  @RequirePermissions('teams:write')
  @ApiOperation({ summary: 'Quitar miembro del equipo' })
  removeMember(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.teams.removeMember(req.user.organizationId, id, userId);
  }
}
