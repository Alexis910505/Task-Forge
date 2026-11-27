import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from '../../core/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '../../core/strategies/jwt-refresh.strategy';
import { InvitationsService } from './invitations.service';
import { MicrosoftAuthService } from './microsoft-auth.service';
import { SsoController } from './sso.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController, SsoController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, MicrosoftAuthService, InvitationsService],
  exports: [AuthService, JwtModule, InvitationsService],
})
export class AuthModule {}
