import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RequestUser } from './jwt.strategy';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
  organizationSlug: string;
  type?: string;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: { body?: { refreshToken?: string } },
    payload: JwtPayload,
  ): Promise<RequestUser & { refreshToken: string }> {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: true,
        organization: true,
        teamMembers: { select: { teamId: true } },
      },
    });
    if (!user?.isActive) {
      throw new UnauthorizedException();
    }
    if (user.organizationId !== payload.organizationId) {
      throw new UnauthorizedException();
    }
    if (user.organization.slug !== payload.organizationSlug) {
      throw new UnauthorizedException();
    }
    const refreshToken = req.body?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    return {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions ?? [],
      organizationId: user.organizationId,
      organizationSlug: user.organization.slug,
      departmentId: user.departmentId ?? null,
      teamIds: user.teamMembers.map((m) => m.teamId),
      refreshToken,
    };
  }
}
