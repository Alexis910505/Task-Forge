import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService, type DashboardPeriod } from './dashboard.service';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';

const PERIODS: DashboardPeriod[] = ['daily', 'weekly', 'monthly'];

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @RequirePermissions('dashboard:read')
  @ApiOperation({ summary: 'Métricas y actividad para el dashboard' })
  @ApiQuery({ name: 'period', required: false, enum: PERIODS })
  summary(
    @Req() req: Request & { user: RequestUser },
    @Query('period') period?: string,
  ) {
    const p = PERIODS.includes(period as DashboardPeriod) ? (period as DashboardPeriod) : 'daily';
    return this.dashboard.summary(req.user.organizationId, p);
  }
}
