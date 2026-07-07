import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/layout/app_mobile_top_bar.dart';
import '../../../core/network/dio_provider.dart';
import '../../auth/application/auth_repository.dart';

enum _MyTasksTab { all, todo, inProgress, completed }

class MyTasksPage extends ConsumerStatefulWidget {
  const MyTasksPage({super.key});

  @override
  ConsumerState<MyTasksPage> createState() => _MyTasksPageState();
}

class _MyTasksPageState extends ConsumerState<MyTasksPage> {
  final _searchCtrl = TextEditingController();
  _MyTasksTab _tab = _MyTasksTab.all;
  List<_TaskItem> _tasks = [];
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() => setState(() {}));
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final dio = ref.read(dioProvider);
      final profile = ref.read(authRepositoryProvider).valueOrNull?.profile;
      final userId = profile?['id']?.toString();

      List<_TaskItem> items = [];
      if (userId != null) {
        final tasksRes = await dio.get<List<dynamic>>(
          '/tasks',
          queryParameters: {'assigneeId': userId},
        );
        final raw = tasksRes.data;
        if (raw is List) {
          items = raw
              .whereType<Map>()
              .map((m) => _TaskItem.fromJson(Map<String, dynamic>.from(m)))
              .toList();
        }
      }

      if (items.isEmpty) {
        final profileRes = await dio.get<Map<String, dynamic>>('/users/me/profile');
        final active = profileRes.data?['activeTasks'];
        if (active is List) {
          for (final raw in active) {
            if (raw is Map) {
              items.add(_TaskItem.fromJson(Map<String, dynamic>.from(raw)));
            }
          }
        }
      }

      if (mounted) {
        setState(() => _tasks = items);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = _formatError(e));
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
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

  List<_TaskItem> get _filtered {
    final q = _searchCtrl.text.trim().toLowerCase();
    return _tasks.where((t) {
      switch (_tab) {
        case _MyTasksTab.all:
          if (t.status == 'COMPLETED') return false;
          break;
        case _MyTasksTab.todo:
          if (t.status != 'TODO' && t.status != 'BACKLOG') return false;
          break;
        case _MyTasksTab.inProgress:
          if (t.status != 'IN_PROGRESS' && t.status != 'REVIEW') return false;
          break;
        case _MyTasksTab.completed:
          if (t.status != 'COMPLETED') return false;
          break;
      }
      if (q.isEmpty) return true;
      return t.title.toLowerCase().contains(q) ||
          t.displayId.toLowerCase().contains(q) ||
          (t.location?.toLowerCase().contains(q) ?? false) ||
          (t.projectName?.toLowerCase().contains(q) ?? false);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).languageCode;
    final profile = ref.watch(authRepositoryProvider).valueOrNull?.profile;
    final filtered = _filtered;

    return Stack(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AppMobileTopBar(profile: profile),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchCtrl,
                      decoration: InputDecoration(
                        hintText: l10n.myTasksSearchHint,
                        prefixIcon: const Icon(Icons.search, size: 22),
                        filled: true,
                        fillColor: scheme.surfaceContainerLow,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: scheme.outlineVariant),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: scheme.outlineVariant),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: scheme.primary, width: 2),
                        ),
                        contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Material(
                    color: scheme.surfaceContainerHigh,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: scheme.outlineVariant),
                    ),
                    child: InkWell(
                      onTap: () {},
                      borderRadius: BorderRadius.circular(12),
                      child: SizedBox(
                        width: 48,
                        height: 48,
                        child: Icon(Icons.filter_list, color: scheme.primary),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            _StatusTabs(
              tab: _tab,
              onChanged: (t) => setState(() => _tab = t),
              l10n: l10n,
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(_error!, textAlign: TextAlign.center),
                                const SizedBox(height: 12),
                                FilledButton(
                                  onPressed: _load,
                                  child: Text(l10n.dashboardRetry),
                                ),
                              ],
                            ),
                          ),
                        )
                      : filtered.isEmpty
                          ? Center(
                              child: Text(
                                l10n.myTasksEmpty,
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: scheme.onSurfaceVariant,
                                ),
                              ),
                            )
                          : RefreshIndicator(
                              onRefresh: _load,
                              child: ListView.separated(
                                padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
                                itemCount: filtered.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 12),
                                itemBuilder: (context, i) {
                                  return _TaskCard(
                                    task: filtered[i],
                                    locale: locale,
                                    l10n: l10n,
                                    onTap: () async {
                                      final changed = await context.push<bool>(
                                        '/tasks/${filtered[i].id}',
                                      );
                                      if (changed == true && mounted) {
                                        await _load();
                                      }
                                    },
                                  );
                                },
                              ),
                            ),
            ),
          ],
        ),
        Positioned(
          right: 20,
          bottom: 20,
          child: FloatingActionButton(
            tooltip: l10n.myTasksNewTask,
            onPressed: () async {
              final created = await context.push<bool>('/tasks/new');
              if (created == true && mounted) {
                await _load();
              }
            },
            child: const Icon(Icons.add, size: 28),
          ),
        ),
      ],
    );
  }
}

class _TaskItem {
  _TaskItem({
    required this.id,
    required this.title,
    required this.status,
    required this.priority,
    this.dueDate,
    this.location,
    this.projectName,
    this.updatedAt,
  });

  final String id;
  final String title;
  final String status;
  final String priority;
  final DateTime? dueDate;
  final String? location;
  final String? projectName;
  final DateTime? updatedAt;

  String get displayId {
    if (id.length <= 8) return '#$id';
    return '#TF-${id.substring(id.length - 4).toUpperCase()}';
  }

  factory _TaskItem.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      return DateTime.tryParse('$v');
    }

    final board = json['board'];
    String? project;
    if (board is Map) {
      project = board['name']?.toString();
      final projectObj = board['project'];
      if (projectObj is Map && projectObj['name'] != null) {
        project = '${projectObj['name']}';
      }
    }
    project ??= json['projectName']?.toString();

    return _TaskItem(
      id: '${json['id'] ?? ''}',
      title: '${json['title'] ?? ''}',
      status: '${json['status'] ?? 'TODO'}',
      priority: '${json['priority'] ?? 'MEDIUM'}',
      dueDate: parseDate(json['dueDate']),
      location: json['location']?.toString(),
      projectName: project,
      updatedAt: parseDate(json['updatedAt']),
    );
  }
}

class _StatusTabs extends StatelessWidget {
  const _StatusTabs({
    required this.tab,
    required this.onChanged,
    required this.l10n,
  });

  final _MyTasksTab tab;
  final ValueChanged<_MyTasksTab> onChanged;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final tabs = [
      (l10n.myTasksTabAll, _MyTasksTab.all),
      (l10n.myTasksTabTodo, _MyTasksTab.todo),
      (l10n.myTasksTabInProgress, _MyTasksTab.inProgress),
      (l10n.myTasksTabCompleted, _MyTasksTab.completed),
    ];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          for (var i = 0; i < tabs.length; i++) ...[
            if (i > 0) const SizedBox(width: 8),
            _tabButton(context, tabs[i].$1, tabs[i].$2, scheme),
          ],
        ],
      ),
    );
  }

  Widget _tabButton(
    BuildContext context,
    String label,
    _MyTasksTab value,
    ColorScheme scheme,
  ) {
    final selected = tab == value;
    return InkWell(
      onTap: () => onChanged(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: selected ? scheme.primary : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.4,
            color: selected ? scheme.primary : scheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({
    required this.task,
    required this.locale,
    required this.l10n,
    required this.onTap,
  });

  final _TaskItem task;
  final String locale;
  final AppLocalizations l10n;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final priority = _PriorityStyle.from(task.priority, scheme);
    final statusIcon = _statusIcon(task, scheme);
    final dueLabel = _dueLabel(task, locale, l10n);
    final isOverdue = task.dueDate != null &&
        task.dueDate!.isBefore(DateTime.now()) &&
        task.status != 'COMPLETED';

    return Material(
      color: scheme.surfaceContainerLowest,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: scheme.outlineVariant),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: statusIcon,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: priority.background,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            priority.label,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.6,
                              color: priority.foreground,
                            ),
                          ),
                        ),
                        const Spacer(),
                        Text(
                          task.displayId,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      task.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 16,
                      runSpacing: 4,
                      children: [
                        if (dueLabel != null)
                          _MetaRow(
                            icon: isOverdue ? Icons.warning_amber_outlined : Icons.calendar_today_outlined,
                            label: dueLabel,
                            color: isOverdue ? scheme.error : scheme.onSurfaceVariant.withValues(alpha: 0.7),
                          ),
                        if (task.location != null && task.location!.isNotEmpty)
                          _MetaRow(
                            icon: Icons.location_on_outlined,
                            label: task.location!,
                            color: scheme.tertiary,
                          )
                        else if (task.projectName != null && task.projectName!.isNotEmpty)
                          _MetaRow(
                            icon: Icons.location_on_outlined,
                            label: task.projectName!,
                            color: scheme.tertiary,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: scheme.onSurfaceVariant.withValues(alpha: 0.4)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statusIcon(_TaskItem task, ColorScheme scheme) {
    if (task.status == 'COMPLETED') {
      return Icon(Icons.check_circle, color: scheme.tertiary, size: 26);
    }
    final overdue = task.dueDate != null &&
        task.dueDate!.isBefore(DateTime.now()) &&
        task.status != 'COMPLETED';
    if (overdue || task.priority == 'CRITICAL') {
      return Icon(Icons.priority_high, color: scheme.error, size: 26);
    }
    if (task.status == 'IN_PROGRESS' || task.status == 'REVIEW') {
      return Icon(Icons.pending, color: scheme.tertiary, size: 26);
    }
    return Icon(Icons.radio_button_unchecked, color: scheme.primaryContainer, size: 26);
  }

  String? _dueLabel(_TaskItem task, String locale, AppLocalizations l10n) {
    if (task.status == 'COMPLETED') {
      final at = task.updatedAt ?? task.dueDate;
      if (at == null) return l10n.myTasksTabCompleted;
      return l10n.myTasksCompletedOn(DateFormat.yMMMd(locale).format(at));
    }
    final due = task.dueDate;
    if (due == null) return null;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final dueDay = DateTime(due.year, due.month, due.day);
    if (due.isBefore(now) && task.status != 'COMPLETED') {
      final diff = now.difference(due);
      if (diff.inHours < 48) {
        return l10n.myTasksOverdueHours(diff.inHours.clamp(1, 999));
      }
      return l10n.myTasksOverdueDays(diff.inDays.clamp(1, 999));
    }
    if (dueDay == today) {
      return l10n.myTasksDueToday(DateFormat.jm(locale).format(due));
    }
    if (dueDay == today.add(const Duration(days: 1))) {
      return l10n.myTasksDueTomorrow;
    }
    return DateFormat.yMMMd(locale).format(due);
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.icon, required this.label, required this.color});

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color),
        ),
      ],
    );
  }
}

class _PriorityStyle {
  const _PriorityStyle({
    required this.label,
    required this.background,
    required this.foreground,
  });

  final String label;
  final Color background;
  final Color foreground;

  static _PriorityStyle from(String priority, ColorScheme scheme) {
    switch (priority.toUpperCase()) {
      case 'CRITICAL':
        return _PriorityStyle(
          label: 'URGENT',
          background: scheme.errorContainer,
          foreground: scheme.onErrorContainer,
        );
      case 'HIGH':
        return _PriorityStyle(
          label: 'HIGH',
          background: scheme.errorContainer,
          foreground: scheme.onErrorContainer,
        );
      case 'LOW':
        return _PriorityStyle(
          label: 'LOW',
          background: scheme.tertiaryContainer,
          foreground: scheme.onTertiaryContainer,
        );
      default:
        return _PriorityStyle(
          label: 'MEDIUM',
          background: scheme.secondaryContainer,
          foreground: scheme.onSecondaryContainer,
        );
    }
  }
}
