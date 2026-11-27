import type { PrismaService } from '../prisma/prisma.service';

/**
 * Cadena de mando (de arriba abajo). Cada rol tiene sus permisos más los de todos
 * los roles que están por debajo. Super Admin e IT quedan fuera de la cadena.
 */
export const COMMAND_CHAIN = ['DEPT_HEAD', 'SUPERVISOR', 'TEAM_LEAD', 'WORKER'] as const;

/** Roles por debajo de este en la cadena (vacío si no está en la cadena). */
export function rolesBelow(roleName: string): string[] {
  const i = (COMMAND_CHAIN as readonly string[]).indexOf(roleName);
  return i < 0 ? [] : COMMAND_CHAIN.slice(i + 1);
}

/** Permisos que un rol recibe de los roles de debajo, con el rol del que vienen. */
export async function inheritedPermissions(
  prisma: PrismaService,
  organizationId: string,
  roleName: string,
): Promise<Map<string, string>> {
  const below = rolesBelow(roleName);
  const out = new Map<string, string>();
  if (!below.length) return out;
  const rows = await prisma.role.findMany({
    where: { organizationId, isSystem: true, name: { in: below } },
    select: { name: true, permissions: true },
  });
  // El rol más cercano manda la etiqueta «heredado de…».
  for (const name of below) {
    for (const p of rows.find((r) => r.name === name)?.permissions ?? []) {
      if (!out.has(p)) out.set(p, name);
    }
  }
  return out;
}

/** Permisos efectivos: los propios del rol más los heredados de la cadena. */
export async function effectivePermissions(
  prisma: PrismaService,
  organizationId: string,
  roleName: string,
  own: readonly string[],
): Promise<string[]> {
  const inherited = await inheritedPermissions(prisma, organizationId, roleName);
  if (!inherited.size) return [...own];
  return [...new Set([...own, ...inherited.keys()])];
}
