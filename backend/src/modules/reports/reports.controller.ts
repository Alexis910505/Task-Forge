import { Controller, Get, Query, Req, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RequestUser } from '../../core/strategies/jwt.strategy';
import { ReportRangeDto } from './dto/report-range.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly prisma: PrismaService,
  ) {}

  private async organizationName(organizationId: string): Promise<string> {
    const o = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    return o?.name ?? 'Organización';
  }

  @Get('productivity')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Productividad del periodo (creadas, completadas, tasa, asignados activos)' })
  productivity(@Req() req: Request & { user: RequestUser }, @Query() query: ReportRangeDto) {
    const range = this.reports.resolveRange(query.from, query.to);
    return this.reports.productivity(req.user.organizationId, range);
  }

  @Get('completed-tasks')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Tareas completadas en el periodo (conteo y muestras recientes)' })
  completedTasks(@Req() req: Request & { user: RequestUser }, @Query() query: ReportRangeDto) {
    const range = this.reports.resolveRange(query.from, query.to);
    return this.reports.completedTasks(req.user.organizationId, range);
  }

  @Get('average-completion-hours')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Tiempo promedio hasta completar (horas) en el periodo' })
  async averageCompletionHours(
    @Req() req: Request & { user: RequestUser },
    @Query() query: ReportRangeDto,
  ) {
    const range = this.reports.resolveRange(query.from, query.to);
    const hours = await this.reports.averageCompletionHours(req.user.organizationId, range);
    return {
      period: { from: range.from.toISOString(), to: range.to.toISOString() },
      averageCompletionHours: hours,
    };
  }

  @Get('overdue-tasks')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Tareas vencidas no completadas (snapshot actual)' })
  overdueTasks(@Req() req: Request & { user: RequestUser }) {
    return this.reports.overdueTasks(req.user.organizationId);
  }

  @Get('performance-by-user')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Rendimiento por usuario en el periodo' })
  performanceByUser(@Req() req: Request & { user: RequestUser }, @Query() query: ReportRangeDto) {
    const range = this.reports.resolveRange(query.from, query.to);
    return this.reports.performanceByUser(req.user.organizationId, range);
  }

  @Get('performance-by-department')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Rendimiento por departamento (según proyecto del tablero)' })
  performanceByDepartment(
    @Req() req: Request & { user: RequestUser },
    @Query() query: ReportRangeDto,
  ) {
    const range = this.reports.resolveRange(query.from, query.to);
    return this.reports.performanceByDepartment(req.user.organizationId, range);
  }

  @Get('overview')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Resumen completo de reportes (todas las métricas)' })
  overview(@Req() req: Request & { user: RequestUser }, @Query() query: ReportRangeDto) {
    const range = this.reports.resolveRange(query.from, query.to);
    return this.reports.overview(req.user.organizationId, range);
  }

  @Get('export/pdf')
  @RequirePermissions('reports:export')
  @ApiOperation({ summary: 'Exportar informe en PDF' })
  async exportPdf(@Req() req: Request & { user: RequestUser }, @Query() query: ReportRangeDto) {
    const range = this.reports.resolveRange(query.from, query.to);
    const name = await this.organizationName(req.user.organizationId);
    const buf = await this.reports.buildPdfBuffer(req.user.organizationId, range, name);
    const slug = range.from.toISOString().slice(0, 10);
    return new StreamableFile(buf, {
      type: 'application/pdf',
      disposition: `attachment; filename="taskforge-reporte-${slug}.pdf"`,
    });
  }

  @Get('export/xlsx')
  @RequirePermissions('reports:export')
  @ApiOperation({ summary: 'Exportar informe en Excel (.xlsx)' })
  async exportXlsx(@Req() req: Request & { user: RequestUser }, @Query() query: ReportRangeDto) {
    const range = this.reports.resolveRange(query.from, query.to);
    const name = await this.organizationName(req.user.organizationId);
    const buf = await this.reports.buildExcelBuffer(req.user.organizationId, range, name);
    const slug = range.from.toISOString().slice(0, 10);
    return new StreamableFile(buf, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="taskforge-reporte-${slug}.xlsx"`,
    });
  }
}
