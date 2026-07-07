import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';

@ApiTags('boards')
@ApiBearerAuth()
@Controller('boards')
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  @Post()
  @RequirePermissions('boards:write')
  @ApiOperation({ summary: 'Crear tablero Kanban' })
  create(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateBoardDto) {
    return this.boards.create(req.user.organizationId, dto);
  }

  @Get(':id')
  @RequirePermissions('boards:read')
  @ApiOperation({ summary: 'Tablero con tareas agrupadas por estado' })
  findOne(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    return this.boards.findOneWithTasks(req.user.organizationId, id);
  }
}
