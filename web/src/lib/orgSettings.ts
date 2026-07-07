export type EmailPreferences = {
  taskEscalations: boolean;
  weeklyAnalytics: boolean;
  deploymentAlerts: boolean;
};

export type OrganizationSettings = {
  timezone?: string;
  emailPreferences?: Partial<EmailPreferences>;
};

const DEFAULT_EMAIL: EmailPreferences = {
  taskEscalations: true,
  weeklyAnalytics: false,
  deploymentAlerts: true,
};

export function parseOrgSettings(raw: unknown): OrganizationSettings {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const o = raw as Record<string, unknown>;
  const email =
    o.emailPreferences && typeof o.emailPreferences === 'object'
      ? (o.emailPreferences as Record<string, unknown>)
      : {};
  return {
    timezone: typeof o.timezone === 'string' ? o.timezone : undefined,
    emailPreferences: {
      taskEscalations:
        typeof email.taskEscalations === 'boolean'
          ? email.taskEscalations
          : DEFAULT_EMAIL.taskEscalations,
      weeklyAnalytics:
        typeof email.weeklyAnalytics === 'boolean'
          ? email.weeklyAnalytics
          : DEFAULT_EMAIL.weeklyAnalytics,
      deploymentAlerts:
        typeof email.deploymentAlerts === 'boolean'
          ? email.deploymentAlerts
          : DEFAULT_EMAIL.deploymentAlerts,
    },
  };
}

export function mergeOrgSettings(
  current: OrganizationSettings,
  patch: Partial<OrganizationSettings>,
): OrganizationSettings {
  return {
    timezone: patch.timezone ?? current.timezone,
    emailPreferences: {
      ...current.emailPreferences,
      ...patch.emailPreferences,
    },
  };
}
