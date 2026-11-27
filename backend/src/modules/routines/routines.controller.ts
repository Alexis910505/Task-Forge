import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import type { RequestUser } from '../../core/strategies/jwt.strategy';
import {
  CheckRoutineItemDto,
  CreateRoutineDto,
  RoutineDateQueryDto,
  UpdateRoutineDto,
} from './dto/routine.dto';
import { RoutinesService } from './routines.service';

type Req = Request & { user: RequestUser };

@ApiTags('routines')
@ApiBearerAuth()
@Controller('routines')
export class RoutinesController {
  constructor(private readonly routines: RoutinesService) {}

  @Get()
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Rutinas que veo o gestiono' })
  list(@Req() req: Req) {
    return this.routines.list(req.user);
  }

  @Get('today')
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Mis rutinas de hoy, con pasos marcados, racha y cumplimiento' })
  today(@Req() req: Req, @Query() q: RoutineDateQueryDto) {
    return this.routines.today(req.user, q.date);
  }

  @Post()
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Crear rutina (personal, o compartida con permiso tasks:assign)' })
  create(@Req() req: Req, @Body() dto: CreateRoutineDto) {
    return this.routines.create(req.user, dto);
  }

  @Get(':id')
  @RequirePermissions('tasks:read')
  findOne(@Req() req: Req, @Param('id') id: string) {
    return this.routines.findOne(req.user, id);
  }

  @Get(':id/stats')
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Cumplimiento por persona (últimos 30 días)' })
  stats(@Req() req: Req, @Param('id') id: string, @Query() q: RoutineDateQueryDto) {
    return this.routines.stats(req.user, id, q.date);
  }

  @Patch(':id')
  @RequirePermissions('tasks:read')
  update(@Req() req: Req, @Param('id') id: string, @Body() dto: UpdateRoutineDto) {
    return this.routines.update(req.user, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Archivar rutina (se conserva el historial)' })
  archive(@Req() req: Req, @Param('id') id: string) {
    return this.routines.archive(req.user, id);
  }

  @Post(':id/check')
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Marcar o desmarcar un paso de hoy' })
  check(@Req() req: Req, @Param('id') id: string, @Body() dto: CheckRoutineItemDto) {
    return this.routines.check(req.user, id, dto);
  }
}
