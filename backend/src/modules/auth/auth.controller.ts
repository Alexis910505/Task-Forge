import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { Public } from '../../core/decorators/public.decorator';
import { JwtRefreshGuard } from '../../core/guards/jwt-refresh.guard';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registro público (rol Worker por defecto)' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login con email y contraseña' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access token' })
  refresh(
    @Body() _dto: RefreshTokenDto,
    @Req() req: Request & { user: RequestUser & { refreshToken: string } },
  ) {
    return this.auth.refresh(req.user.userId, req.user.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({
    summary:
      'Cerrar sesión. Con refreshToken en el body solo invalida ese dispositivo; sin él, todas las sesiones.',
  })
  logout(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: LogoutDto,
  ) {
    return this.auth.logout(req.user.userId, dto.refreshToken);
  }
}
