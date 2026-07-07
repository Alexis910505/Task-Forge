/** Etiquetas de habilidades derivadas del departamento (sin campo en BD). */
export function profileSkills(departmentName: string | null | undefined): string[] {
  if (!departmentName) {
    return ['Operations', 'Task Mgmt'];
  }
  const n = departmentName.toLowerCase();
  if (/logistic|fleet|transport/.test(n)) {
    return ['Fleet Mgmt', 'SAP/ERP', 'Route Planning', 'Data Viz'];
  }
  if (/maint|repair|facility/.test(n)) {
    return ['Equipment', 'Safety', 'CMMS', 'Diagnostics'];
  }
  if (/field|service/.test(n)) {
    return ['On-site Ops', 'Crisis Response', 'Mobile Tools', 'SLA'];
  }
  if (/complian|quality|audit/.test(n)) {
    return ['ISO Standards', 'Auditing', 'Documentation', 'Risk'];
  }
  return ['Operations', 'Collaboration', 'Reporting', departmentName.split(' ')[0] ?? 'Ops'];
}

export type ProfileCredential = {
  id: string;
  titleKey: string;
  subtitleKey: string;
  variant: 'tertiary' | 'primary';
};

export function profileCredentials(
  roleName: string,
  tasksCompleted: number,
): ProfileCredential[] {
  const creds: ProfileCredential[] = [];
  if (tasksCompleted >= 5) {
    creds.push({
      id: 'iso',
      titleKey: 'profile.credIsoTitle',
      subtitleKey: 'profile.credIsoSub',
      variant: 'tertiary',
    });
  }
  if (roleName === 'MANAGER' || roleName === 'ADMIN' || tasksCompleted >= 20) {
    creds.push({
      id: 'sigma',
      titleKey: 'profile.credSigmaTitle',
      subtitleKey: 'profile.credSigmaSub',
      variant: 'primary',
    });
  }
  return creds;
}

export function taskRefCode(taskId: string): string {
  return taskId.replace(/-/g, '').slice(-8).toUpperCase();
}
