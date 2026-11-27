import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { userCan } from '../../core/security/role-permissions';
import type { RequestUser } from '../../core/strategies/jwt.strategy';
import { CheckRoutineItemDto, CreateRoutineDto, UpdateRoutineDto } from './dto/routine.dto';
import { addDays, isoWeekday, isPlausibleToday, utcDateOf } from './routine-dates.util';

const userSelect = { id: true, firstName: true, lastName: true, email: true } as const;

const routineInclude = {
  items: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  assignees: { include: { user: { select: userSelect } } },
  owner: { select: userSelect },
} satisfies Prisma.RoutineInclude;

type RoutineWithItems = Prisma.RoutineGetPayload<{ include: { items: true } }>;
type RoutineFull = Prisma.RoutineGetPayload<{ include: typeof routineInclude }>;

/** Días hacia atrás que se miran para rachas. */
const STREAK_LOOKBACK_DAYS = 400;
/** Ventana del % de cumplimiento y del calendario. */
const STATS_WINDOW_DAYS = 30;
const HISTORY_DAYS = 28;

export type RoutineDayStatus = 'done' | 'partial' | 'missed' | 'pending' | 'off';

@Injectable()
export class RoutinesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- permisos ----------

  /** Crear y gestionar rutinas compartidas: quien puede asignar tareas (supervisores, jefes, admin). */
  canManageShared(user: RequestUser): boolean {
    return userCan(user, 'tasks:assign');
  }

  private canEdit(user: RequestUser, r: { personal: boolean; ownerId: string }): boolean {
    if (r.personal) return r.ownerId === user.userId;
    return r.ownerId === user.userId || this.canManageShared(user);
  }

  /** Rutinas que este usuario tiene que hacer. */
  private doableWhere(user: RequestUser): Prisma.RoutineWhereInput {
    return {
      organizationId: user.organizationId,
      isActive: true,
      OR: [
        { personal: true, ownerId: user.userId },
        { personal: false, assignees: { some: { userId: user.userId } } },
        { personal: false, assignees: { none: {} } },
      ],
    };
  }

  private assertToday(date: string) {
    if (!isPlausibleToday(date)) {
      throw new BadRequestException('Solo se puede marcar la rutina del día de hoy');
    }
  }

  // ---------- gestión ----------

  async list(user: RequestUser) {
    const where: Prisma.RoutineWhereInput = this.canManageShared(user)
      ? {
          organizationId: user.organizationId,
          isActive: true,
          OR: [{ personal: true, ownerId: user.userId }, { personal: false }],
        }
      : this.doableWhere(user);
    const routines = await this.prisma.routine.findMany({
      where,
      include: routineInclude,
      orderBy: [{ personal: 'asc' }, { name: 'asc' }],
    });
    return routines.map((r) => this.present(user, r));
  }

  async findOne(user: RequestUser, id: string) {
    const r = await this.prisma.routine.findFirst({
      where: { id, organizationId: user.organizationId, isActive: true },
      include: routineInclude,
    });
    if (!r || (r.personal && r.ownerId !== user.userId)) throw new NotFoundException();
    return this.present(user, r);
  }

  private present(user: RequestUser, r: RoutineFull) {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      personal: r.personal,
      weekdays: [...r.weekdays].sort(),
      owner: r.owner,
      items: r.items.map((i) => ({ id: i.id, title: i.title })),
      assignees: r.assignees.map((a) => a.user),
      createdAt: r.createdAt,
      canEdit: this.canEdit(user, r),
    };
  }

  async create(user: RequestUser, dto: CreateRoutineDto) {
    const personal = dto.personal ?? true;
    if (!personal && !this.canManageShared(user)) {
      throw new ForbiddenException('No tienes permiso para crear rutinas para otros usuarios');
    }
    const assigneeIds = personal ? [] : await this.validAssignees(user, dto.assigneeIds ?? []);
    const r = await this.prisma.routine.create({
      data: {
        organizationId: user.organizationId,
        ownerId: user.userId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        personal,
        weekdays: [...new Set(dto.weekdays)].sort(),
        items: {
          create: dto.items.map((it, i) => ({ title: it.title.trim(), sortOrder: i })),
        },
        assignees: { create: assigneeIds.map((userId) => ({ userId })) },
      },
      include: routineInclude,
    });
    return this.present(user, r);
  }

  async update(user: RequestUser, id: string, dto: UpdateRoutineDto) {
    const r = await this.prisma.routine.findFirst({
      where: { id, organizationId: user.organizationId, isActive: true },
      include: { items: true },
    });
    if (!r || (r.personal && r.ownerId !== user.userId)) throw new NotFoundException();
    if (!this.canEdit(user, r)) throw new ForbiddenException();
    const assigneeIds =
      dto.assigneeIds !== undefined && !r.personal
        ? await this.validAssignees(user, dto.assigneeIds)
        : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.routine.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
          ...(dto.weekdays !== undefined ? { weekdays: [...new Set(dto.weekdays)].sort() } : {}),
        },
      });
      if (dto.items) {
        const existing = new Set(r.items.map((i) => i.id));
        const kept = new Set(dto.items.filter((i) => i.id && existing.has(i.id)).map((i) => i.id!));
        // Los pasos quitados se borran; sus marcas antiguas conservan el título (itemTitle).
        await tx.routineItem.deleteMany({ where: { routineId: id, id: { notIn: [...kept] } } });
        for (const [i, it] of dto.items.entries()) {
          if (it.id && kept.has(it.id)) {
            await tx.routineItem.update({
              where: { id: it.id },
              data: { title: it.title.trim(), sortOrder: i },
            });
          } else {
            await tx.routineItem.create({
              data: { routineId: id, title: it.title.trim(), sortOrder: i },
            });
          }
        }
      }
      if (assigneeIds) {
        await tx.routineAssignee.deleteMany({ where: { routineId: id } });
        await tx.routineAssignee.createMany({
          data: assigneeIds.map((userId) => ({ routineId: id, userId })),
        });
      }
    });
    return this.findOne(user, id);
  }

  /** Archiva la rutina: deja de aparecer, pero su historial se conserva. */
  async archive(user: RequestUser, id: string) {
    const r = await this.prisma.routine.findFirst({
      where: { id, organizationId: user.organizationId, isActive: true },
    });
    if (!r || (r.personal && r.ownerId !== user.userId)) throw new NotFoundException();
    if (!this.canEdit(user, r)) throw new ForbiddenException();
    await this.prisma.routine.update({ where: { id }, data: { isActive: false } });
    return { ok: true };
  }

  private async validAssignees(user: RequestUser, ids: string[]): Promise<string[]> {
    const unique = [...new Set(ids)];
    if (!unique.length) return [];
    const found = await this.prisma.user.count({
      where: { id: { in: unique }, organizationId: user.organizationId },
    });
    if (found !== unique.length) throw new BadRequestException('Usuario asignado no válido');
    return unique;
  }

  // ---------- el día ----------

  /** Rutinas que le tocan hoy al usuario, con sus pasos marcados y su racha. */
  async today(user: RequestUser, date: string) {
    this.assertToday(date);
    const routines = await this.prisma.routine.findMany({
      where: { ...this.doableWhere(user), weekdays: { has: isoWeekday(date) } },
      include: { items: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
      orderBy: [{ personal: 'asc' }, { name: 'asc' }],
    });
    return Promise.all(routines.map((r) => this.dayView(user.userId, r, date)));
  }

  async check(user: RequestUser, routineId: string, dto: CheckRoutineItemDto) {
    this.assertToday(dto.date);
    const r = await this.prisma.routine.findFirst({
      where: { id: routineId, ...this.doableWhere(user) },
      include: { items: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
    });
    if (!r) throw new NotFoundException();
    if (!r.weekdays.includes(isoWeekday(dto.date))) {
      throw new BadRequestException('Esta rutina no toca este día');
    }
    const item = r.items.find((i) => i.id === dto.itemId);
    if (!item) throw new NotFoundException('Paso no encontrado');

    const key = { routineId_userId_date: { routineId, userId: user.userId, date: dto.date } };
    const run = await this.prisma.routineRun.upsert({
      where: key,
      create: { routineId, userId: user.userId, date: dto.date, totalItems: r.items.length },
      update: {},
    });
    if (dto.checked) {
      await this.prisma.routineRunCheck.createMany({
        data: [{ runId: run.id, itemId: item.id, itemTitle: item.title }],
        skipDuplicates: true,
      });
    } else {
      await this.prisma.routineRunCheck.deleteMany({ where: { runId: run.id, itemId: item.id } });
    }
    const checked = await this.prisma.routineRunCheck.count({
      where: { runId: run.id, itemId: { in: r.items.map((i) => i.id) } },
    });
    const complete = checked >= r.items.length;
    await this.prisma.routineRun.update({
      where: { id: run.id },
      data: {
        totalItems: r.items.length,
        completedAt: complete ? (run.completedAt ?? new Date()) : null,
      },
    });
    return this.dayView(user.userId, r, dto.date);
  }

  private async dayView(userId: string, r: RoutineWithItems, date: string) {
    const run = await this.prisma.routineRun.findUnique({
      where: { routineId_userId_date: { routineId: r.id, userId, date } },
      include: { checks: true },
    });
    const checks = new Map((run?.checks ?? []).map((c) => [c.itemId, c.checkedAt]));
    const items = r.items.map((i) => ({
      id: i.id,
      title: i.title,
      checked: checks.has(i.id),
      checkedAt: checks.get(i.id) ?? null,
    }));
    const done = items.filter((i) => i.checked).length;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      personal: r.personal,
      weekdays: [...r.weekdays].sort(),
      date,
      items,
      done,
      total: items.length,
      completed: Boolean(run?.completedAt),
      completedAt: run?.completedAt ?? null,
      ...(await this.userStats(userId, r, date)),
    };
  }

  /**
   * Racha (días seguidos cumplidos), % de cumplimiento de los últimos 30 días
   * y calendario de las últimas 4 semanas. Solo cuentan los días en que tocaba la rutina.
   */
  private async userStats(
    userId: string,
    r: { id: string; weekdays: number[]; createdAt: Date },
    today: string,
  ) {
    const runs = await this.prisma.routineRun.findMany({
      where: {
        routineId: r.id,
        userId,
        date: { gte: addDays(today, -STREAK_LOOKBACK_DAYS), lte: today },
      },
      select: { date: true, completedAt: true, _count: { select: { checks: true } } },
    });
    const byDate = new Map(runs.map((x) => [x.date, x]));
    const earliestRun = runs.reduce<string | null>(
      (min, x) => (min === null || x.date < min ? x.date : min),
      null,
    );
    const created = utcDateOf(r.createdAt);
    const start = earliestRun && earliestRun < created ? earliestRun : created;
    const scheduled = (d: string) => r.weekdays.includes(isoWeekday(d));
    const isDone = (d: string) => Boolean(byDate.get(d)?.completedAt);

    let streak = 0;
    let d = isDone(today) ? today : addDays(today, -1);
    for (let i = 0; i < STREAK_LOOKBACK_DAYS && d >= start; i += 1, d = addDays(d, -1)) {
      if (!scheduled(d)) continue;
      if (!isDone(d)) break;
      streak += 1;
    }

    let scheduledDays = 0;
    let completedDays = 0;
    for (let i = 0; i < STATS_WINDOW_DAYS; i += 1) {
      const day = addDays(today, -i);
      if (day < start || !scheduled(day)) continue;
      if (day === today && !isDone(day)) continue; // hoy todavía no cuenta en contra
      scheduledDays += 1;
      if (isDone(day)) completedDays += 1;
    }

    const history: { date: string; status: RoutineDayStatus }[] = [];
    for (let i = HISTORY_DAYS - 1; i >= 0; i -= 1) {
      const day = addDays(today, -i);
      let status: RoutineDayStatus = 'off';
      if (isDone(day)) status = 'done';
      else if (scheduled(day) && day >= start) {
        if ((byDate.get(day)?._count.checks ?? 0) > 0) status = day === today ? 'pending' : 'partial';
        else status = day === today ? 'pending' : 'missed';
      }
      history.push({ date: day, status });
    }

    return {
      streak,
      completionRate: scheduledDays > 0 ? Math.round((completedDays / scheduledDays) * 100) : null,
      scheduledDays,
      completedDays,
      lastCompletedDate:
        runs
          .filter((x) => x.completedAt)
          .map((x) => x.date)
          .sort()
          .at(-1) ?? null,
      history,
    };
  }

  /** Cumplimiento por persona (para quien gestiona la rutina) o solo el propio. */
  async stats(user: RequestUser, id: string, date: string) {
    this.assertToday(date);
    const r = await this.prisma.routine.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { assignees: { include: { user: { select: userSelect } } } },
    });
    if (!r || (r.personal && r.ownerId !== user.userId)) throw new NotFoundException();

    let people: { id: string; firstName: string; lastName: string; email: string }[];
    if (r.personal || !this.canEdit(user, r)) {
      const me = await this.prisma.user.findUniqueOrThrow({
        where: { id: user.userId },
        select: userSelect,
      });
      people = [me];
    } else if (r.assignees.length) {
      people = r.assignees.map((a) => a.user);
    } else {
      // Rutina para todos: las personas activas de la organización.
      people = await this.prisma.user.findMany({
        where: { organizationId: user.organizationId, isActive: true },
        select: userSelect,
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        take: 200,
      });
    }
    const rows = await Promise.all(
      people.map(async (p) => ({ user: p, ...(await this.userStats(p.id, r, date)) })),
    );
    return {
      routine: { id: r.id, name: r.name, personal: r.personal, weekdays: [...r.weekdays].sort() },
      date,
      people: rows,
    };
  }
}
