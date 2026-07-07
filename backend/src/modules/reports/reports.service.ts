import { Injectable } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../core/prisma/prisma.service';

export type ReportRange = { from: Date; to: Date };

export type UserPerformanceRow = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName: string | null;
  tasksAssigned: number;
  tasksCompletedInPeriod: number;
  overdueOpen: number;
  avgCompletionHours: number | null;
};

export type DepartmentPerformanceRow = {
  departmentId: string | null;
  departmentName: string;
  tasksTotal: number;
  tasksCompletedInPeriod: number;
  overdueOpen: number;
};

export type WeeklyOutputRow = {
  label: string;
  created: number;
  completed: number;
  target: number;
};

export type SlaDepartmentRow = DepartmentPerformanceRow & {
  successPercent: number;
  doneCount: number;
  lateCount: number;
};

export type UserPerformanceWithSla = UserPerformanceRow & {
  slaPercent: number;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  resolveRange(fromIso?: string, toIso?: string): ReportRange {
    const to = toIso ? new Date(toIso) : new Date();
    to.setHours(23, 59, 59, 999);
    let from: Date;
    if (fromIso) {
      from = new Date(fromIso);
      from.setHours(0, 0, 0, 0);
    } else {
      from = new Date(to);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
    }
    return { from, to };
  }

  private taskOrgFilter(organizationId: string): Prisma.TaskWhereInput {
    return { board: { organizationId } };
  }

  async productivity(organizationId: string, range: ReportRange) {
    const base = this.taskOrgFilter(organizationId);
    const [tasksCreated, tasksCompleted, distinctAssignees] = await Promise.all([
      this.prisma.task.count({
        where: { ...base, createdAt: { gte: range.from, lte: range.to } },
      }),
      this.prisma.task.count({
        where: {
          ...base,
          status: TaskStatus.COMPLETED,
          updatedAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.task.findMany({
        where: {
          ...base,
          assigneeId: { not: null },
          OR: [
            { createdAt: { gte: range.from, lte: range.to } },
            { updatedAt: { gte: range.from, lte: range.to } },
          ],
        },
        distinct: ['assigneeId'],
        select: { assigneeId: true },
      }),
    ]);

    const completionRate =
      tasksCreated > 0 ? Math.round((tasksCompleted / tasksCreated) * 1000) / 10 : tasksCompleted > 0 ? 100 : 0;

    return {
      period: { from: range.from.toISOString(), to: range.to.toISOString() },
      tasksCreatedInPeriod: tasksCreated,
      tasksCompletedInPeriod: tasksCompleted,
      completionRatePercent: completionRate,
      activeAssigneesInPeriod: distinctAssignees.length,
    };
  }

  async completedTasks(organizationId: string, range: ReportRange) {
    const base = this.taskOrgFilter(organizationId);
    const [count, samples] = await Promise.all([
      this.prisma.task.count({
        where: {
          ...base,
          status: TaskStatus.COMPLETED,
          updatedAt: { gte: range.from, lte: range.to },
        },
      }),
      this.prisma.task.findMany({
        where: {
          ...base,
          status: TaskStatus.COMPLETED,
          updatedAt: { gte: range.from, lte: range.to },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          createdAt: true,
          assignee: { select: { firstName: true, lastName: true, email: true } },
          board: { select: { name: true, project: { select: { name: true } } } },
        },
      }),
    ]);
    return {
      period: { from: range.from.toISOString(), to: range.to.toISOString() },
      completedCount: count,
      recentCompleted: samples,
    };
  }

  async averageCompletionHours(organizationId: string, range: ReportRange): Promise<number | null> {
    const rows = await this.prisma.$queryRaw<{ avg: Prisma.Decimal | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600.0) AS avg
      FROM "Task" t
      INNER JOIN "Board" b ON b.id = t."boardId"
      WHERE b."organizationId" = ${organizationId}
        AND t.status = 'COMPLETED'::"TaskStatus"
        AND t."updatedAt" >= ${range.from}
        AND t."updatedAt" <= ${range.to}
    `;
    const v = rows[0]?.avg;
    if (v == null) {
      return null;
    }
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  }

  async overdueTasks(organizationId: string) {
    const base = this.taskOrgFilter(organizationId);
    const now = new Date();
    const [count, items] = await Promise.all([
      this.prisma.task.count({
        where: {
          ...base,
          status: { not: TaskStatus.COMPLETED },
          dueDate: { lt: now },
        },
      }),
      this.prisma.task.findMany({
        where: {
          ...base,
          status: { not: TaskStatus.COMPLETED },
          dueDate: { lt: now },
        },
        orderBy: { dueDate: 'asc' },
        take: 100,
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          assignee: { select: { firstName: true, lastName: true, email: true } },
          board: { select: { name: true } },
        },
      }),
    ]);
    return {
      asOf: now.toISOString(),
      overdueCount: count,
      overdueTasks: items,
    };
  }

  async performanceByUser(organizationId: string, range: ReportRange): Promise<UserPerformanceRow[]> {
    const rows = await this.prisma.$queryRaw<
      {
        user_id: string;
        first_name: string;
        last_name: string;
        email: string;
        department_name: string | null;
        tasks_assigned: bigint;
        tasks_completed: bigint;
        overdue_open: bigint;
        avg_completion_hours: Prisma.Decimal | null;
      }[]
    >`
      SELECT
        u.id AS user_id,
        u."firstName" AS first_name,
        u."lastName" AS last_name,
        u.email AS email,
        d.name AS department_name,
        COUNT(t.id)::bigint AS tasks_assigned,
        COUNT(t.id) FILTER (
          WHERE t.status = 'COMPLETED'::"TaskStatus"
            AND t."updatedAt" >= ${range.from}
            AND t."updatedAt" <= ${range.to}
        )::bigint AS tasks_completed,
        COUNT(t.id) FILTER (
          WHERE t.status <> 'COMPLETED'::"TaskStatus"
            AND t."dueDate" IS NOT NULL
            AND t."dueDate" < NOW()
        )::bigint AS overdue_open,
        ROUND(
          CAST(
            AVG(
              EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600.0
            ) FILTER (
              WHERE t.status = 'COMPLETED'::"TaskStatus"
                AND t."updatedAt" >= ${range.from}
                AND t."updatedAt" <= ${range.to}
            ) AS numeric
          ),
          2
        ) AS avg_completion_hours
      FROM "User" u
      LEFT JOIN "Department" d ON d.id = u."departmentId"
      LEFT JOIN "Task" t ON t."assigneeId" = u.id
      LEFT JOIN "Board" b ON b.id = t."boardId"
      WHERE u."organizationId" = ${organizationId}
        AND u."isActive" = true
        AND (t.id IS NULL OR b."organizationId" = ${organizationId})
      GROUP BY u.id, u."firstName", u."lastName", u.email, d.name
      HAVING COUNT(t.id) > 0
      ORDER BY tasks_completed DESC, u."lastName" ASC
    `;

    return rows.map((r) => ({
      userId: r.user_id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      departmentName: r.department_name,
      tasksAssigned: Number(r.tasks_assigned),
      tasksCompletedInPeriod: Number(r.tasks_completed),
      overdueOpen: Number(r.overdue_open),
      avgCompletionHours:
        r.avg_completion_hours != null ? Number(r.avg_completion_hours) : null,
    }));
  }

  async performanceByDepartment(
    organizationId: string,
    range: ReportRange,
  ): Promise<DepartmentPerformanceRow[]> {
    const rows = await this.prisma.$queryRaw<
      {
        department_id: string | null;
        department_name: string | null;
        tasks_total: bigint;
        tasks_completed: bigint;
        overdue_open: bigint;
      }[]
    >`
      SELECT
        dep.id AS department_id,
        dep.name AS department_name,
        COUNT(t.id)::bigint AS tasks_total,
        COUNT(t.id) FILTER (
          WHERE t.status = 'COMPLETED'::"TaskStatus"
            AND t."updatedAt" >= ${range.from}
            AND t."updatedAt" <= ${range.to}
        )::bigint AS tasks_completed,
        COUNT(t.id) FILTER (
          WHERE t.status <> 'COMPLETED'::"TaskStatus"
            AND t."dueDate" IS NOT NULL
            AND t."dueDate" < NOW()
        )::bigint AS overdue_open
      FROM "Task" t
      INNER JOIN "Board" b ON b.id = t."boardId"
      INNER JOIN "Project" p ON p.id = b."projectId"
      LEFT JOIN "Department" dep ON dep.id = p."departmentId"
      WHERE b."organizationId" = ${organizationId}
      GROUP BY dep.id, dep.name
      ORDER BY tasks_completed DESC NULLS LAST
    `;

    return rows.map((r) => ({
      departmentId: r.department_id,
      departmentName: r.department_name ?? 'Sin departamento',
      tasksTotal: Number(r.tasks_total),
      tasksCompletedInPeriod: Number(r.tasks_completed),
      overdueOpen: Number(r.overdue_open),
    }));
  }

  private previousRange(range: ReportRange): ReportRange {
    const durationMs = range.to.getTime() - range.from.getTime();
    const to = new Date(range.from.getTime() - 1);
    to.setHours(23, 59, 59, 999);
    const from = new Date(to.getTime() - durationMs);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }

  async weeklyOutput(organizationId: string, range: ReportRange): Promise<WeeklyOutputRow[]> {
    const base = this.taskOrgFilter(organizationId);
    const segmentCount = 5;
    const durationMs = range.to.getTime() - range.from.getTime();
    const segmentMs = Math.max(durationMs / segmentCount, 1);

    const buckets: WeeklyOutputRow[] = [];
    let totalCreated = 0;

    for (let i = 0; i < segmentCount; i++) {
      const segFrom = new Date(range.from.getTime() + i * segmentMs);
      const segTo =
        i === segmentCount - 1
          ? range.to
          : new Date(range.from.getTime() + (i + 1) * segmentMs - 1);

      const [created, completed] = await Promise.all([
        this.prisma.task.count({
          where: { ...base, createdAt: { gte: segFrom, lte: segTo } },
        }),
        this.prisma.task.count({
          where: {
            ...base,
            status: TaskStatus.COMPLETED,
            updatedAt: { gte: segFrom, lte: segTo },
          },
        }),
      ]);

      totalCreated += created;
      buckets.push({
        label: `WK ${i + 1}`,
        created,
        completed,
        target: 0,
      });
    }

    const avgCreated = totalCreated / segmentCount;
    return buckets.map((b, i) => ({
      ...b,
      target: Math.max(0, Math.round(avgCreated * (0.82 + i * 0.04))),
    }));
  }

  private withSlaDepartments(rows: DepartmentPerformanceRow[]): SlaDepartmentRow[] {
    return rows.map((d) => {
      const doneCount = d.tasksCompletedInPeriod;
      const lateCount = d.overdueOpen;
      const denom = doneCount + lateCount;
      const successPercent = denom > 0 ? Math.round((doneCount / denom) * 1000) / 10 : 100;
      return { ...d, successPercent, doneCount, lateCount };
    });
  }

  private withSlaUsers(rows: UserPerformanceRow[]): UserPerformanceWithSla[] {
    return rows.map((u) => {
      const done = u.tasksCompletedInPeriod;
      const late = u.overdueOpen;
      const denom = done + late;
      const slaPercent = denom > 0 ? Math.round((done / denom) * 1000) / 10 : 100;
      return { ...u, slaPercent };
    });
  }

  async overview(organizationId: string, range: ReportRange) {
    const prevRange = this.previousRange(range);
    const [
      productivity,
      completed,
      avgHours,
      overdue,
      byUser,
      byDepartment,
      weeklyOutput,
      prevProductivity,
    ] = await Promise.all([
      this.productivity(organizationId, range),
      this.completedTasks(organizationId, range),
      this.averageCompletionHours(organizationId, range),
      this.overdueTasks(organizationId),
      this.performanceByUser(organizationId, range),
      this.performanceByDepartment(organizationId, range),
      this.weeklyOutput(organizationId, range),
      this.productivity(organizationId, prevRange),
    ]);

    const slaByDepartment = this.withSlaDepartments(byDepartment);
    const usersWithSla = this.withSlaUsers(byUser).slice(0, 5);

    const totalDone = slaByDepartment.reduce((s, d) => s + d.doneCount, 0);
    const totalLate = slaByDepartment.reduce((s, d) => s + d.lateCount, 0);

    let efficiencyDeltaPercent: number | null = null;
    const currRate = productivity.completionRatePercent;
    const prevRate = prevProductivity.completionRatePercent;
    if (prevRate > 0) {
      efficiencyDeltaPercent = Math.round((currRate - prevRate) * 10) / 10;
    } else if (currRate > 0) {
      efficiencyDeltaPercent = currRate;
    }

    const tasksInPeriod = Math.max(
      productivity.tasksCreatedInPeriod,
      byDepartment.reduce((s, d) => s + d.tasksTotal, 0),
    );

    return {
      productivity,
      completedTasks: completed,
      averageCompletionHours: avgHours,
      overdueTasks: overdue,
      byUser: usersWithSla,
      byDepartment,
      slaByDepartment,
      weeklyOutput,
      summary: {
        tasksInPeriod,
        efficiencyDeltaPercent,
        totalDone,
        totalLate,
      },
    };
  }

  async buildPdfBuffer(organizationId: string, range: ReportRange, organizationName: string): Promise<Buffer> {
    const data = await this.overview(organizationId, range);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('TaskForge — Informe de productividad', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Organización: ${organizationName}`);
      doc.text(`Periodo: ${data.productivity.period.from} → ${data.productivity.period.to}`);
      doc.moveDown();

      doc.fontSize(12).text('Resumen', { underline: true });
      doc.fontSize(10);
      doc.text(`Tareas creadas en periodo: ${data.productivity.tasksCreatedInPeriod}`);
      doc.text(`Tareas completadas en periodo: ${data.productivity.tasksCompletedInPeriod}`);
      doc.text(`Tasa de cierre (%): ${data.productivity.completionRatePercent}`);
      doc.text(`Asignados activos (periodo): ${data.productivity.activeAssigneesInPeriod}`);
      doc.text(
        `Tiempo promedio hasta completar (h): ${data.averageCompletionHours != null ? String(data.averageCompletionHours) : 'N/D'}`,
      );
      doc.text(`Tareas vencidas (abiertas, a fecha de hoy): ${data.overdueTasks.overdueCount}`);
      doc.moveDown();

      doc.fontSize(12).text('Rendimiento por usuario', { underline: true });
      doc.fontSize(9);
      for (const u of data.byUser.slice(0, 40)) {
        doc.text(
          `${u.firstName} ${u.lastName} | completadas: ${u.tasksCompletedInPeriod} | asignadas: ${u.tasksAssigned} | vencidas: ${u.overdueOpen} | t.promedio h: ${u.avgCompletionHours ?? 'N/D'}`,
        );
      }
      doc.moveDown();

      doc.fontSize(12).text('Rendimiento por departamento (vía proyecto del tablero)', { underline: true });
      doc.fontSize(9);
      for (const d of data.byDepartment) {
        doc.text(
          `${d.departmentName} | total tareas: ${d.tasksTotal} | completadas (periodo): ${d.tasksCompletedInPeriod} | vencidas abiertas: ${d.overdueOpen}`,
        );
      }

      doc.end();
    });
  }

  async buildExcelBuffer(organizationId: string, range: ReportRange, organizationName: string): Promise<Buffer> {
    const data = await this.overview(organizationId, range);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'TaskForge';
    wb.created = new Date();

    const summary = wb.addWorksheet('Resumen');
    summary.addRow(['Organización', organizationName]);
    summary.addRow(['Desde', data.productivity.period.from]);
    summary.addRow(['Hasta', data.productivity.period.to]);
    summary.addRow([]);
    summary.addRow(['Tareas creadas (periodo)', data.productivity.tasksCreatedInPeriod]);
    summary.addRow(['Tareas completadas (periodo)', data.productivity.tasksCompletedInPeriod]);
    summary.addRow(['Tasa cierre %', data.productivity.completionRatePercent]);
    summary.addRow(['Asignados activos (periodo)', data.productivity.activeAssigneesInPeriod]);
    summary.addRow(['Tiempo promedio completación (h)', data.averageCompletionHours ?? '']);
    summary.addRow(['Tareas vencidas abiertas', data.overdueTasks.overdueCount]);

    const usersSheet = wb.addWorksheet('Por usuario');
    usersSheet.addRow([
      'Usuario',
      'Email',
      'Departamento',
      'Asignadas',
      'Completadas (periodo)',
      'Vencidas abiertas',
      'Tiempo prom. completación (h)',
    ]);
    for (const u of data.byUser) {
      usersSheet.addRow([
        `${u.firstName} ${u.lastName}`,
        u.email,
        u.departmentName ?? '',
        u.tasksAssigned,
        u.tasksCompletedInPeriod,
        u.overdueOpen,
        u.avgCompletionHours ?? '',
      ]);
    }

    const depSheet = wb.addWorksheet('Por departamento');
    depSheet.addRow(['Departamento', 'Total tareas', 'Completadas (periodo)', 'Vencidas abiertas']);
    for (const d of data.byDepartment) {
      depSheet.addRow([d.departmentName, d.tasksTotal, d.tasksCompletedInPeriod, d.overdueOpen]);
    }

    const overdueSheet = wb.addWorksheet('Vencidas');
    overdueSheet.addRow(['Título', 'Estado', 'Vencimiento', 'Asignado', 'Tablero']);
    for (const t of data.overdueTasks.overdueTasks) {
      overdueSheet.addRow([
        t.title,
        t.status,
        t.dueDate?.toISOString() ?? '',
        t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : '',
        t.board.name,
      ]);
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
