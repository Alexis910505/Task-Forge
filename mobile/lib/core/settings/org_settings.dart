class EmailPreferences {
  const EmailPreferences({
    this.taskEscalations = true,
    this.weeklyAnalytics = false,
    this.deploymentAlerts = true,
  });

  final bool taskEscalations;
  final bool weeklyAnalytics;
  final bool deploymentAlerts;

  EmailPreferences copyWith({
    bool? taskEscalations,
    bool? weeklyAnalytics,
    bool? deploymentAlerts,
  }) {
    return EmailPreferences(
      taskEscalations: taskEscalations ?? this.taskEscalations,
      weeklyAnalytics: weeklyAnalytics ?? this.weeklyAnalytics,
      deploymentAlerts: deploymentAlerts ?? this.deploymentAlerts,
    );
  }

  Map<String, dynamic> toJson() => {
        'taskEscalations': taskEscalations,
        'weeklyAnalytics': weeklyAnalytics,
        'deploymentAlerts': deploymentAlerts,
      };
}

class OrganizationSettings {
  const OrganizationSettings({
    this.timezone,
    this.emailPreferences = const EmailPreferences(),
  });

  final String? timezone;
  final EmailPreferences emailPreferences;

  OrganizationSettings copyWith({
    String? timezone,
    EmailPreferences? emailPreferences,
  }) {
    return OrganizationSettings(
      timezone: timezone ?? this.timezone,
      emailPreferences: emailPreferences ?? this.emailPreferences,
    );
  }

  Map<String, dynamic> toJson() => {
        if (timezone != null) 'timezone': timezone,
        'emailPreferences': emailPreferences.toJson(),
      };
}

OrganizationSettings parseOrgSettings(dynamic raw) {
  if (raw is! Map) {
    return const OrganizationSettings();
  }
  final emailRaw = raw['emailPreferences'];
  EmailPreferences email = const EmailPreferences();
  if (emailRaw is Map) {
    email = EmailPreferences(
      taskEscalations: emailRaw['taskEscalations'] is bool
          ? emailRaw['taskEscalations'] as bool
          : true,
      weeklyAnalytics: emailRaw['weeklyAnalytics'] is bool
          ? emailRaw['weeklyAnalytics'] as bool
          : false,
      deploymentAlerts: emailRaw['deploymentAlerts'] is bool
          ? emailRaw['deploymentAlerts'] as bool
          : true,
    );
  }
  return OrganizationSettings(
    timezone: raw['timezone']?.toString(),
    emailPreferences: email,
  );
}

OrganizationSettings mergeOrgSettings(
  OrganizationSettings current,
  OrganizationSettings patch,
) {
  return OrganizationSettings(
    timezone: patch.timezone ?? current.timezone,
    emailPreferences: current.emailPreferences.copyWith(
      taskEscalations: patch.emailPreferences.taskEscalations,
      weeklyAnalytics: patch.emailPreferences.weeklyAnalytics,
      deploymentAlerts: patch.emailPreferences.deploymentAlerts,
    ),
  );
}

const commonTimezones = <String>[
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/Bogota',
  'America/Argentina/Buenos_Aires',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Paris',
];

List<String> timezoneOptionsIncluding(String? current) {
  final set = {...commonTimezones};
  if (current != null && current.isNotEmpty) {
    set.add(current);
  }
  final list = set.toList()..sort();
  return list;
}
