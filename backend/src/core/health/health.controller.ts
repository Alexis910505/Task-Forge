import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  /** No consulta la BD a propósito: así el health check no impide que Neon se suspenda. */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Estado del proceso' })
  check() {
    return { status: 'ok' };
  }
}
