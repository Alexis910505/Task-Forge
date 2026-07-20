import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/layout/app_mobile_top_bar.dart';
import '../../../core/network/dio_provider.dart';
import '../../../core/offline/offline_providers.dart';
import '../../auth/application/auth_repository.dart';

/// Perfil del usuario (`assets/taskforge_my_profile`).
class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  Map<String, dynamic>? _payload;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final dio = Get.find<ApiClient>().dio;
      final res = await dio.get<Map<String, dynamic>>('/users/me/profile');
      if (mounted) {
        setState(() {
          _payload = res.data;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e is DioException ? (e.message ?? '$e') : '$e';
          _loading = false;
        });
      }
    }
  }

  Future<void> _signOut() async {
    await Get.find<LocalDataService>().clearAllUserData();
    await Get.find<AuthController>().logout();
    if (mounted) {
      context.go('/login');
    }
  }

  String _roleLabel(String role, AppLocalizations l10n) {
    switch (role) {
      case 'ADMIN':
        return l10n.profileRoleAdmin;
      case 'DEPT_HEAD':
        return l10n.profileRoleDeptHead;
      case 'SUPERVISOR':
        return l10n.profileRoleSupervisor;
      case 'TEAM_LEAD':
        return l10n.profileRoleTeamLead;
      case 'WORKER':
        return l10n.profileRoleWorker;
      case 'MANAGER':
        return l10n.profileRoleManager;
      case 'INSPECTOR':
        return l10n.profileRoleInspector;
      case 'VIEWER':
        return l10n.profileRoleViewer;
      default:
        return role.replaceAll('_', ' ');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;
    final sessionProfile = Get.find<AuthController>().currentSession?.profile;

    if (_loading && _payload == null) {
      return ColoredBox(
        color: scheme.surface,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
          children: [
            AppMobileTopBar(profile: sessionProfile),
            const SizedBox(height: 48),
            Center(child: CircularProgressIndicator(color: scheme.primary)),
          ],
        ),
      );
    }

    final user =
        (_payload?['user'] as Map?)?.cast<String, dynamic>() ?? sessionProfile;
    final stats = (_payload?['stats'] as Map?)?.cast<String, dynamic>();

    final first = '${user?['firstName'] ?? ''}'.trim();
    final last = '${user?['lastName'] ?? ''}'.trim();
    final fullName = [first, last].where((s) => s.isNotEmpty).join(' ');
    final initials =
        '${first.isNotEmpty ? first[0] : ''}${last.isNotEmpty ? last[0] : ''}'
            .toUpperCase();

    final dept = user?['department'];
    final deptName = dept is Map ? '${dept['name'] ?? ''}'.trim() : '';
    final role = user?['role'];
    final roleName = role is Map ? '${role['name'] ?? ''}' : '';

    final efficiency = _num(stats?['efficiencyPercent']) ?? 0.0;
    final tasksMonth = _num(stats?['tasksCompletedMonth'])?.round() ?? 0;
    final avgHours = _num(stats?['avgResolutionHours']);
    final trend = _num(stats?['monthTrendPercent']);

    return ColoredBox(
      color: scheme.surface,
      child: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
          children: [
            AppMobileTopBar(profile: sessionProfile ?? user),
            if (_error != null) ...[
              MaterialBanner(
                content: Text(_error!),
                actions: [
                  TextButton(
                    onPressed: _load,
                    child: Text(l10n.dashboardRetry),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],
            const SizedBox(height: 8),
            _ProfileHero(
              initials: initials.isNotEmpty ? initials : '?',
              fullName: fullName.isNotEmpty ? fullName : l10n.navProfile,
              department:
                  deptName.isNotEmpty ? deptName : l10n.profileNoDepartment,
              roleLabel: roleName.isNotEmpty ? _roleLabel(roleName, l10n) : '—',
              onEditTap: () => context.go('/settings'),
            ),
            const SizedBox(height: 28),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  l10n.profilePerformanceTitle,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  l10n.profileLast30Days,
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: scheme.primary,
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _PerformanceBento(
              efficiency: efficiency,
              trend: trend,
              tasksDone: tasksMonth,
              avgHours: avgHours,
              l10n: l10n,
            ),
            const SizedBox(height: 28),
            _ProfileActionGroup(
              items: [
                _ProfileActionItem(
                  icon: Icons.settings_outlined,
                  label: l10n.profileMySettings,
                  onTap: () => context.go('/settings'),
                ),
                _ProfileActionItem(
                  icon: Icons.help_outline,
                  label: l10n.profileHelpSupport,
                  onTap: () => _showComingSoon(context, l10n),
                ),
                _ProfileActionItem(
                  icon: Icons.verified_user_outlined,
                  label: l10n.profileSecurityPrivacy,
                  onTap: () => _showComingSoon(context, l10n),
                ),
              ],
            ),
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: _signOut,
              style: OutlinedButton.styleFrom(
                foregroundColor: scheme.error,
                backgroundColor: scheme.errorContainer.withValues(alpha: 0.25),
                side: BorderSide(color: scheme.error.withValues(alpha: 0.2)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              icon: const Icon(Icons.logout),
              label: Text(
                l10n.signOut.toUpperCase(),
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showComingSoon(BuildContext context, AppLocalizations l10n) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(l10n.profileComingSoon)));
  }

  static double? _num(dynamic v) {
    if (v is num) return v.toDouble();
    if (v is String) return double.tryParse(v);
    return null;
  }
}

class _ProfileHero extends StatelessWidget {
  const _ProfileHero({
    required this.initials,
    required this.fullName,
    required this.department,
    required this.roleLabel,
    required this.onEditTap,
  });

  final String initials;
  final String fullName;
  final String department;
  final String roleLabel;
  final VoidCallback onEditTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: scheme.surface,
                border: Border.all(
                  color: scheme.surfaceContainerHigh,
                  width: 4,
                ),
                boxShadow: [
                  BoxShadow(
                    color: scheme.shadow.withValues(alpha: 0.06),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: CircleAvatar(
                radius: 44,
                backgroundColor: scheme.primaryFixedDim.withValues(alpha: 0.5),
                foregroundColor: scheme.primary,
                child: Text(
                  initials,
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            Positioned(
              right: 0,
              bottom: 0,
              child: Material(
                color: scheme.primary,
                shape: const CircleBorder(),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: onEditTap,
                  child: const Padding(
                    padding: EdgeInsets.all(6),
                    child: Icon(Icons.edit, size: 16, color: Colors.white),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          fullName,
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          department.toUpperCase(),
          textAlign: TextAlign.center,
          style: theme.textTheme.bodySmall?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
            color: scheme.onSurfaceVariant.withValues(alpha: 0.85),
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: scheme.secondaryContainer.withValues(alpha: 0.35),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.verified_user, size: 18, color: scheme.secondary),
              const SizedBox(width: 6),
              Text(
                roleLabel,
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: scheme.onSecondaryContainer,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _PerformanceBento extends StatelessWidget {
  const _PerformanceBento({
    required this.efficiency,
    required this.trend,
    required this.tasksDone,
    required this.avgHours,
    required this.l10n,
  });

  final double efficiency;
  final double? trend;
  final int tasksDone;
  final double? avgHours;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final cardDeco = BoxDecoration(
      color: scheme.surfaceContainerLow,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: scheme.outlineVariant),
    );

    final trendText =
        trend != null && trend! > 0
            ? l10n.profileTrendUp(
              trend!.toStringAsFixed(trend! % 1 == 0 ? 0 : 1),
            )
            : null;

    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          decoration: cardDeco,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    l10n.profileEfficiencyRating.toUpperCase(),
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                  Icon(Icons.trending_up, color: scheme.tertiary, size: 22),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    '${efficiency.toStringAsFixed(1)}%',
                    style: theme.textTheme.displaySmall?.copyWith(
                      fontWeight: FontWeight.w900,
                      height: 1,
                    ),
                  ),
                  if (trendText != null) ...[
                    const SizedBox(width: 8),
                    Text(
                      trendText,
                      style: theme.textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: scheme.tertiary,
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(999),
                child: LinearProgressIndicator(
                  value: (efficiency / 100).clamp(0.0, 1.0),
                  minHeight: 6,
                  backgroundColor: scheme.outlineVariant.withValues(
                    alpha: 0.35,
                  ),
                  color: scheme.tertiary,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: cardDeco,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.profileTasksDone.toUpperCase(),
                      style: theme.textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.4,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '$tasksDone',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: cardDeco,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.profileAvgTime.toUpperCase(),
                      style: theme.textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.4,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      avgHours != null
                          ? l10n.profileHoursUnit(avgHours!.toStringAsFixed(1))
                          : '—',
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _ProfileActionItem {
  const _ProfileActionItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
}

class _ProfileActionGroup extends StatelessWidget {
  const _ProfileActionGroup({required this.items});

  final List<_ProfileActionItem> items;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++) ...[
            if (i > 0)
              Divider(
                height: 1,
                indent: 68,
                endIndent: 16,
                color: scheme.outlineVariant.withValues(alpha: 0.35),
              ),
            _ProfileActionTile(item: items[i]),
          ],
        ],
      ),
    );
  }
}

class _ProfileActionTile extends StatelessWidget {
  const _ProfileActionTile({required this.item});

  final _ProfileActionItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: item.onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(item.icon, color: scheme.primary, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  item.label,
                  style: theme.textTheme.bodyLarge?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}
