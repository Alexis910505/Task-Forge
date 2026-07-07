import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RoleName } from '@prisma/client';

export type RequestUser = {
  userId: string;
  email: string;
  role: RoleName;
  organizationId: string;
  organizationSlug: string;
};

type JwtPayload = {
  sub: string;
  email: string;
  role: RoleName;
  organizationId: string;
  organizationSlug: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true, organization: true },
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
    return {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      organizationId: user.organizationId,
      organizationSlug: user.organization.slug,
    };
  }
}
