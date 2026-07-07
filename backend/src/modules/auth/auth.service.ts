import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { ClientSessionDto } from './dto/client-session.dto';
import { AuthTokensDto } from './dto/auth-tokens.dto';

type ClientSession = { clientId?: string; platform?: 'web' | 'mobile' };

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const slug = dto.organizationSlug.toLowerCase().trim();
    const org = await this.prisma.organization.findUnique({ where: { slug } });
    if (!org) {
      throw new NotFoundException('Organización no encontrada');
    }
    const existing = await this.prisma.user.findUnique({
      where: {
        organizationId_email: {
          organizationId: org.id,
          email: dto.email.toLowerCase().trim(),
        },
      },
    });
    if (existing) {
      throw new ConflictException('El correo ya está registrado en esta organización');
    }
    const role = await this.prisma.role.findUnique({
      where: {
        organizationId_name: {
          organizationId: org.id,
          name: RoleName.WORKER,
        },
      },
    });
    if (!role) {
      throw new ConflictException('La organización no tiene roles configurados');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        organizationId: org.id,
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: role.id,
      },
    });
    return this.issueTokens(
      user.id,
      user.email,
      RoleName.WORKER,
      org.id,
      org.slug,
      this.clientSessionFromDto(dto),
    );
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const slug = dto.organizationSlug.toLowerCase().trim();
    const org = await this.prisma.organization.findUnique({ where: { slug } });
    if (!org) {
      throw new UnauthorizedException('Organización no válida');
    }
    const user = await this.prisma.user.findUnique({
      where: {
        organizationId_email: {
          organizationId: org.id,
          email: dto.email.toLowerCase().trim(),
        },
      },
      include: { role: true },
    });
    if (!user?.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    let ok = false;
    try {
      ok = await bcrypt.compare(dto.password, user.passwordHash);
    } catch {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.issueTokens(
      user.id,
      user.email,
      user.role.name,
      org.id,
      org.slug,
      this.clientSessionFromDto(dto),
    );
  }

  async refresh(userId: string, refreshToken: string): Promise<AuthTokensDto> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.userId !== userId || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Sesión expirada');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, organization: true },
    });
    if (!user?.isActive) {
      throw new UnauthorizedException();
    }
    const session: ClientSession = {
      clientId: stored.clientId ?? undefined,
      platform: (stored.platform as 'web' | 'mobile' | null) ?? undefined,
    };
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokens(
      user.id,
      user.email,
      user.role.name,
      user.organizationId,
      user.organization.slug,
      session,
    );
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId, tokenHash: hashToken(refreshToken) },
      });
      return;
    }
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  private clientSessionFromDto(dto: ClientSessionDto): ClientSession | undefined {
    const clientId = dto.clientId?.trim();
    const platform = dto.platform;
    if (!clientId && !platform) {
      return undefined;
    }
    return { clientId: clientId || undefined, platform };
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: RoleName,
    organizationId: string,
    organizationSlug: string,
    session?: ClientSession,
  ): Promise<AuthTokensDto> {
    const accessExpires = this.config.get<string>('JWT_ACCESS_EXPIRES') ?? '15m';
    const refreshExpires = this.config.get<string>('JWT_REFRESH_EXPIRES') ?? '7d';
    const accessSeconds = this.parseDurationToSeconds(accessExpires);
    const refreshSeconds = this.parseDurationToSeconds(refreshExpires);

    const payload = { sub: userId, email, role, organizationId, organizationSlug };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessSeconds,
    });

    const refreshToken = await this.jwt.signAsync(
      { ...payload, type: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshSeconds,
      },
    );

    const refreshMs = refreshSeconds * 1000;
    await this.prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });
    if (session?.clientId) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId, clientId: session.clientId },
      });
    }
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId,
        clientId: session?.clientId ?? null,
        platform: session?.platform ?? null,
        expiresAt: new Date(Date.now() + refreshMs),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpires,
    };
  }

  private parseDurationToSeconds(input: string): number {
    const m = /^(\d+)([smhd])$/i.exec(input.trim());
    if (!m) {
      return 900;
    }
    const n = Number(m[1]);
    const u = m[2].toLowerCase();
    if (u === 's') {
      return n;
    }
    if (u === 'm') {
      return n * 60;
    }
    if (u === 'h') {
      return n * 3600;
    }
    return n * 86400;
  }
}
