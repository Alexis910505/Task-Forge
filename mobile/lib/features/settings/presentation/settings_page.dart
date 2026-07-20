import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:image_picker/image_picker.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/branding/app_logo.dart';
import '../../../core/i18n/locale_controller.dart';
import '../../../core/layout/app_mobile_top_bar.dart';
import '../../../core/network/api_urls.dart';
import '../../../core/network/dio_provider.dart';
import '../../../core/security/user_permissions_provider.dart';
import '../../../core/settings/org_settings.dart';
import '../../auth/application/auth_repository.dart';

enum _SettingsTab { workspace, notifications, security, api }

/// Ajustes (`assets/taskforge_settings`, alineado con web `SettingsPage`).
class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  _SettingsTab _tab = _SettingsTab.workspace;
  bool _loading = true;
  bool _saving = false;
  bool _uploading = false;
  String? _error;
  String? _saveError;
  bool _editingGeneral = false;

  Map<String, dynamic>? _org;
  final _nameCtrl = TextEditingController();
  String _timezone = 'UTC';
  EmailPreferences _emailPrefs = const EmailPreferences();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  String _formatError(Object e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map) {
        final m = data['message'];
        if (m is String && m.isNotEmpty) return m;
        if (m is List) return m.map((x) => '$x').join(', ');
      }
      return e.message ?? '$e';
    }
    return '$e';
  }

  void _applyOrg(Map<String, dynamic> row) {
    _org = row;
    _nameCtrl.text = '${row['name'] ?? ''}';
    final parsed = parseOrgSettings(row['settings']);
    _timezone = parsed.timezone ?? 'UTC';
    _emailPrefs = parsed.emailPreferences;
  }

  Future<void> _load() async {
    if (!canReadOrganization()) {
      setState(() {
        _loading = false;
        _error = AppLocalizations.of(context)!.settingsNoOrgAccess;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await Get.find<ApiClient>().dio.get<Map<String, dynamic>>(
        '/organizations/current',
      );
      if (mounted && res.data != null) {
        setState(() {
          _applyOrg(res.data!);
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = _formatError(e);
          _loading = false;
        });
      }
    }
  }

  Future<bool> _persist({String? name, OrganizationSettings? settings}) async {
    if (!canWriteOrganization()) {
      return false;
    }
    setState(() {
      _saving = true;
      _saveError = null;
    });
    try {
      final current = parseOrgSettings(_org?['settings']);
      final next = settings ?? current;
      final body = <String, dynamic>{
        if (name != null) 'name': name.trim(),
        'settings': {
          'timezone': next.timezone ?? _timezone,
          'emailPreferences': next.emailPreferences.toJson(),
        },
      };
      final res = await Get.find<ApiClient>().dio.patch<Map<String, dynamic>>(
        '/organizations/current',
        data: body,
      );
      if (res.data != null) {
        _applyOrg(res.data!);
      }
      return true;
    } catch (e) {
      if (mounted) {
        setState(() => _saveError = _formatError(e));
      }
      return false;
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _saveGeneral() async {
    final ok = await _persist(
      name: _nameCtrl.text,
      settings: parseOrgSettings(
        _org?['settings'],
      ).copyWith(timezone: _timezone),
    );
    if (ok && mounted) {
      setState(() => _editingGeneral = false);
    }
  }

  Future<void> _updateEmailPref(String key, bool value) async {
    final next = switch (key) {
      'taskEscalations' => _emailPrefs.copyWith(taskEscalations: value),
      'weeklyAnalytics' => _emailPrefs.copyWith(weeklyAnalytics: value),
      _ => _emailPrefs.copyWith(deploymentAlerts: value),
    };
    setState(() => _emailPrefs = next);
    if (!canWriteOrganization()) {
      return;
    }
    final parsed = parseOrgSettings(_org?['settings']);
    await _persist(
      settings: parsed.copyWith(
        timezone: parsed.timezone ?? _timezone,
        emailPreferences: next,
      ),
    );
  }

  Future<void> _uploadBranding(String kind) async {
    if (!canWriteOrganization()) {
      return;
    }
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 90,
    );
    if (picked == null) {
      return;
    }
    setState(() => _uploading = true);
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          picked.path,
          filename: picked.name,
        ),
      });
      await Get.find<ApiClient>().dio.post<void>(
        '/organizations/current/branding/$kind',
        data: formData,
      );
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              AppLocalizations.of(context)!.settingsBrandingUploadFailed,
            ),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _uploading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;
    final profile = Get.find<AuthController>().currentSession?.profile;
    final canWrite = canWriteOrganization();
    final locale = Get.find<LocaleController>().locale.value;
    final tzOptions = timezoneOptionsIncluding(_timezone);

    return ColoredBox(
      color: scheme.surface,
      child: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
          children: [
            AppMobileTopBar(profile: profile),
            Text(
              l10n.settingsWorkspaceTitle,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              l10n.settingsWorkspaceSubtitle,
              style: theme.textTheme.bodySmall?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            if (_saveError != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: MaterialBanner(
                  content: Text(_saveError!),
                  actions: [
                    TextButton(
                      onPressed: () => setState(() => _saveError = null),
                      child: const Text('OK'),
                    ),
                  ],
                ),
              ),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              MaterialBanner(
                content: Text(_error!),
                actions: [
                  TextButton(
                    onPressed: _load,
                    child: Text(l10n.dashboardRetry),
                  ),
                ],
              )
            else ...[
              SizedBox(
                height: 44,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _TabChip(
                      label: l10n.settingsTabWorkspace,
                      icon: Icons.business_outlined,
                      selected: _tab == _SettingsTab.workspace,
                      onTap:
                          () => setState(() => _tab = _SettingsTab.workspace),
                    ),
                    const SizedBox(width: 8),
                    _TabChip(
                      label: l10n.settingsTabNotifications,
                      icon: Icons.notifications_active_outlined,
                      selected: _tab == _SettingsTab.notifications,
                      onTap:
                          () =>
                              setState(() => _tab = _SettingsTab.notifications),
                    ),
                    const SizedBox(width: 8),
                    _TabChip(
                      label: l10n.settingsTabSecurity,
                      icon: Icons.security_outlined,
                      selected: _tab == _SettingsTab.security,
                      onTap: () => setState(() => _tab = _SettingsTab.security),
                    ),
                    const SizedBox(width: 8),
                    _TabChip(
                      label: l10n.settingsTabApi,
                      icon: Icons.integration_instructions_outlined,
                      selected: _tab == _SettingsTab.api,
                      onTap: () => setState(() => _tab = _SettingsTab.api),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              switch (_tab) {
                _SettingsTab.workspace => _WorkspaceTab(
                  l10n: l10n,
                  canWrite: canWrite,
                  editing: _editingGeneral,
                  saving: _saving,
                  uploading: _uploading,
                  nameCtrl: _nameCtrl,
                  timezone: _timezone,
                  tzOptions: tzOptions,
                  slug: '${_org?['slug'] ?? ''}',
                  logoUrl: _org?['logoUrl']?.toString(),
                  faviconUrl: _org?['faviconUrl']?.toString(),
                  emailPrefs: _emailPrefs,
                  onTimezone: (v) => setState(() => _timezone = v),
                  onStartEdit: () => setState(() => _editingGeneral = true),
                  onCancelEdit: () {
                    setState(() {
                      _editingGeneral = false;
                      _nameCtrl.text = '${_org?['name'] ?? ''}';
                      _timezone =
                          parseOrgSettings(_org?['settings']).timezone ?? 'UTC';
                    });
                  },
                  onSave: _saveGeneral,
                  onEmailToggle: _updateEmailPref,
                  onUploadLogo: () => _uploadBranding('logo'),
                  onUploadIcon: () => _uploadBranding('favicon'),
                  security: _SecurityCard(l10n: l10n, canWrite: canWrite),
                ),
                _SettingsTab.notifications => Column(
                  children: [
                    _EmailPrefsCard(
                      l10n: l10n,
                      canWrite: canWrite,
                      saving: _saving,
                      prefs: _emailPrefs,
                      onToggle: _updateEmailPref,
                    ),
                    const SizedBox(height: 16),
                    _LanguageCard(l10n: l10n, locale: locale),
                  ],
                ),
                _SettingsTab.security => _SecurityCard(
                  l10n: l10n,
                  canWrite: canWrite,
                ),
                _SettingsTab.api => _ApiCard(l10n: l10n),
              },
            ],
          ],
        ),
      ),
    );
  }
}

class _TabChip extends StatelessWidget {
  const _TabChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: FilterChip(
        label: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
            ),
          ],
        ),
        selected: selected,
        onSelected: (_) => onTap(),
        selectedColor: scheme.primaryContainer,
        labelStyle: TextStyle(
          color: selected ? scheme.onPrimaryContainer : scheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

class _WorkspaceTab extends StatelessWidget {
  const _WorkspaceTab({
    required this.l10n,
    required this.canWrite,
    required this.editing,
    required this.saving,
    required this.uploading,
    required this.nameCtrl,
    required this.timezone,
    required this.tzOptions,
    required this.slug,
    required this.logoUrl,
    required this.faviconUrl,
    required this.emailPrefs,
    required this.onTimezone,
    required this.onStartEdit,
    required this.onCancelEdit,
    required this.onSave,
    required this.onEmailToggle,
    required this.onUploadLogo,
    required this.onUploadIcon,
    required this.security,
  });

  final AppLocalizations l10n;
  final bool canWrite;
  final bool editing;
  final bool saving;
  final bool uploading;
  final TextEditingController nameCtrl;
  final String timezone;
  final List<String> tzOptions;
  final String slug;
  final String? logoUrl;
  final String? faviconUrl;
  final EmailPreferences emailPrefs;
  final ValueChanged<String> onTimezone;
  final VoidCallback onStartEdit;
  final VoidCallback onCancelEdit;
  final VoidCallback onSave;
  final Future<void> Function(String key, bool value) onEmailToggle;
  final VoidCallback onUploadLogo;
  final VoidCallback onUploadIcon;
  final Widget security;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _GeneralInfoCard(
          l10n: l10n,
          canWrite: canWrite,
          editing: editing,
          saving: saving,
          nameCtrl: nameCtrl,
          timezone: timezone,
          tzOptions: tzOptions,
          slug: slug,
          onTimezone: onTimezone,
          onStartEdit: onStartEdit,
          onCancelEdit: onCancelEdit,
          onSave: onSave,
        ),
        const SizedBox(height: 16),
        _LogoCard(
          l10n: l10n,
          canWrite: canWrite,
          uploading: uploading,
          logoUrl: logoUrl,
          onUploadLogo: onUploadLogo,
          onUploadIcon: onUploadIcon,
        ),
        const SizedBox(height: 16),
        _EmailPrefsCard(
          l10n: l10n,
          canWrite: canWrite,
          saving: saving,
          prefs: emailPrefs,
          onToggle: onEmailToggle,
        ),
        const SizedBox(height: 16),
        security,
      ],
    );
  }
}

class _SettingsCard extends StatelessWidget {
  const _SettingsCard({required this.child, this.title, this.trailing});

  final Widget child;
  final String? title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (title != null)
              Row(
                children: [
                  Expanded(
                    child: Text(
                      title!,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (trailing != null) trailing!,
                ],
              ),
            if (title != null) const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }
}

class _GeneralInfoCard extends StatelessWidget {
  const _GeneralInfoCard({
    required this.l10n,
    required this.canWrite,
    required this.editing,
    required this.saving,
    required this.nameCtrl,
    required this.timezone,
    required this.tzOptions,
    required this.slug,
    required this.onTimezone,
    required this.onStartEdit,
    required this.onCancelEdit,
    required this.onSave,
  });

  final AppLocalizations l10n;
  final bool canWrite;
  final bool editing;
  final bool saving;
  final TextEditingController nameCtrl;
  final String timezone;
  final List<String> tzOptions;
  final String slug;
  final ValueChanged<String> onTimezone;
  final VoidCallback onStartEdit;
  final VoidCallback onCancelEdit;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    final readOnly = !editing || !canWrite;
    return _SettingsCard(
      title: l10n.settingsGeneralInfo,
      trailing:
          canWrite && !editing
              ? TextButton(
                onPressed: onStartEdit,
                child: Text(l10n.settingsEditInfo),
              )
              : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _FieldLabel(l10n.settingsWorkspaceName),
          TextField(
            controller: nameCtrl,
            readOnly: readOnly,
            decoration: const InputDecoration(isDense: true),
          ),
          const SizedBox(height: 16),
          _FieldLabel(l10n.settingsTimezone),
          DropdownButtonFormField<String>(
            initialValue:
                tzOptions.contains(timezone) ? timezone : tzOptions.first,
            items:
                tzOptions
                    .map((tz) => DropdownMenuItem(value: tz, child: Text(tz)))
                    .toList(),
            onChanged:
                readOnly ? null : (v) => v != null ? onTimezone(v) : null,
          ),
          const SizedBox(height: 16),
          _FieldLabel(l10n.settingsWorkspaceUrl),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainer,
                  borderRadius: const BorderRadius.horizontal(
                    left: Radius.circular(8),
                  ),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outlineVariant,
                  ),
                ),
                child: Text(
                  'taskforge.io/',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
              Expanded(
                child: InputDecorator(
                  decoration: const InputDecoration(
                    isDense: true,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.horizontal(
                        right: Radius.circular(8),
                      ),
                    ),
                  ),
                  child: Text(slug),
                ),
              ),
            ],
          ),
          if (editing && canWrite) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: onCancelEdit,
                    child: Text(l10n.settingsCancel),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed:
                        saving || nameCtrl.text.trim().length < 2
                            ? null
                            : onSave,
                    child: Text(
                      saving ? l10n.settingsSaving : l10n.settingsSave,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _LogoCard extends StatelessWidget {
  const _LogoCard({
    required this.l10n,
    required this.canWrite,
    required this.uploading,
    required this.logoUrl,
    required this.onUploadLogo,
    required this.onUploadIcon,
  });

  final AppLocalizations l10n;
  final bool canWrite;
  final bool uploading;
  final String? logoUrl;
  final VoidCallback onUploadLogo;
  final VoidCallback onUploadIcon;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final logoSrc =
        logoUrl != null && logoUrl!.isNotEmpty
            ? resolveUploadUrl(logoUrl!)
            : null;
    return _SettingsCard(
      title: l10n.settingsLogoSection,
      child: Column(
        children: [
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: scheme.outlineVariant, width: 2),
              color: scheme.surfaceContainerHigh,
            ),
            clipBehavior: Clip.antiAlias,
            child:
                logoSrc != null
                    ? Image.network(
                      logoSrc,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const AppLogo(size: 56),
                    )
                    : const AppLogo(size: 56),
          ),
          const SizedBox(height: 12),
          Text(
            l10n.settingsLogoHint,
            textAlign: TextAlign.center,
            style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 13),
          ),
          if (canWrite) ...[
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: uploading ? null : onUploadLogo,
              child: Text(
                uploading ? l10n.settingsUploading : l10n.settingsUploadLogo,
              ),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: uploading ? null : onUploadIcon,
              child: Text(l10n.settingsUploadIcon),
            ),
          ] else
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                l10n.settingsReadOnlyHint,
                style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
              ),
            ),
        ],
      ),
    );
  }
}

class _EmailPrefsCard extends StatelessWidget {
  const _EmailPrefsCard({
    required this.l10n,
    required this.canWrite,
    required this.saving,
    required this.prefs,
    required this.onToggle,
  });

  final AppLocalizations l10n;
  final bool canWrite;
  final bool saving;
  final EmailPreferences prefs;
  final Future<void> Function(String key, bool value) onToggle;

  @override
  Widget build(BuildContext context) {
    return _SettingsCard(
      title: l10n.settingsEmailPreferences,
      child: Column(
        children: [
          _ToggleRow(
            label: l10n.settingsTaskEscalations,
            description: l10n.settingsTaskEscalationsDesc,
            value: prefs.taskEscalations,
            onChanged:
                canWrite && !saving
                    ? (v) => onToggle('taskEscalations', v)
                    : null,
          ),
          _ToggleRow(
            label: l10n.settingsWeeklyAnalytics,
            description: l10n.settingsWeeklyAnalyticsDesc,
            value: prefs.weeklyAnalytics,
            onChanged:
                canWrite && !saving
                    ? (v) => onToggle('weeklyAnalytics', v)
                    : null,
          ),
          _ToggleRow(
            label: l10n.settingsDeploymentAlerts,
            description: l10n.settingsDeploymentAlertsDesc,
            value: prefs.deploymentAlerts,
            onChanged:
                canWrite && !saving
                    ? (v) => onToggle('deploymentAlerts', v)
                    : null,
          ),
          if (!canWrite)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                l10n.settingsReadOnlyHint,
                style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _LanguageCard extends StatelessWidget {
  const _LanguageCard({required this.l10n, required this.locale});

  final AppLocalizations l10n;
  final Locale locale;

  @override
  Widget build(BuildContext context) {
    return _SettingsCard(
      title: l10n.settingsLanguage,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.settingsLanguageSectionDesc,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          SegmentedButton<String>(
            segments: [
              ButtonSegment(
                value: 'es',
                label: Text(l10n.settingsLanguageSpanish),
              ),
              ButtonSegment(
                value: 'en',
                label: Text(l10n.settingsLanguageEnglish),
              ),
            ],
            selected: {locale.languageCode},
            onSelectionChanged: (set) {
              final code = set.first;
              Get.find<LocaleController>().setLocale(Locale(code));
            },
          ),
        ],
      ),
    );
  }
}

class _SecurityCard extends StatelessWidget {
  const _SecurityCard({required this.l10n, required this.canWrite});

  final AppLocalizations l10n;
  final bool canWrite;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return _SettingsCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: scheme.errorContainer,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.lock_person_outlined,
                  color: scheme.onErrorContainer,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.settingsSsoTitle,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      l10n.settingsSsoDesc,
                      style: TextStyle(
                        color: scheme.onSurfaceVariant,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: canWrite ? () {} : null,
            child: Text(l10n.settingsConfigureSso),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _FeatureChip(
                icon: Icons.shield_outlined,
                label: l10n.settingsFeature2fa,
              ),
              _FeatureChip(
                icon: Icons.history,
                label: l10n.settingsFeatureRotation,
              ),
              _FeatureChip(
                icon: Icons.vpn_key_outlined,
                label: l10n.settingsFeatureIp,
                muted: true,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            l10n.settingsSecuritySoon,
            style: TextStyle(fontSize: 12, color: scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _ApiCard extends StatelessWidget {
  const _ApiCard({required this.l10n});

  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    return _SettingsCard(
      title: l10n.settingsApiTitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.settingsApiDesc,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: null,
            child: Text(l10n.settingsGenerateKey),
          ),
          const SizedBox(height: 8),
          Text(
            l10n.settingsApiSoon,
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w700,
          letterSpacing: 0.5,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

class _ToggleRow extends StatelessWidget {
  const _ToggleRow({
    required this.label,
    required this.description,
    required this.value,
    this.onChanged,
  });

  final String label;
  final String description;
  final bool value;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 13,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged == null ? null : (v) => onChanged!(v),
          ),
        ],
      ),
    );
  }
}

class _FeatureChip extends StatelessWidget {
  const _FeatureChip({
    required this.icon,
    required this.label,
    this.muted = false,
  });

  final IconData icon;
  final String label;
  final bool muted;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Opacity(
      opacity: muted ? 0.5 : 1,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerLow,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: scheme.outlineVariant),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 20, color: scheme.primary),
            const SizedBox(width: 8),
            Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}
