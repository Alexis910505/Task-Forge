import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/layout/app_mobile_top_bar.dart';
import '../../auth/application/auth_repository.dart';
import '../application/my_tasks_controller.dart';

class MyTasksPage extends StatefulWidget {
  const MyTasksPage({super.key});

  @override
  State<MyTasksPage> createState() => _MyTasksPageState();
}

class _MyTasksPageState extends State<MyTasksPage> {
  late final MyTasksController _controller;
  final _searchCtrl = TextEditingController();

  MyTasksTab get _tab => _controller.tab.value;
  List<MyTaskItem> get _tasks => _controller.tasks;

  @override
  void initState() {
    super.initState();
    _controller = Get.find<MyTasksController>();
    _searchCtrl.addListener(() => setState(() {}));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _controller.load(quiet: _controller.tasks.isNotEmpty);
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  List<_ListEntry> get _listEntries {
    final filtered = _filtered;
    final sort = _controller.sort.value;
    final entries = <_ListEntry>[];

    // Criticidad / tiempo: lista plana. Proyecto: agrupa como antes.
    if (sort == MyTasksSort.byProject) {
      String? lastProject;
      for (final task in filtered) {
        final project =
            (task.projectName ?? '').trim().isEmpty
                ? '—'
                : task.projectName!.trim();
        if (project != lastProject) {
          entries.add(_ListEntry.header(project));
          lastProject = project;
        }
        entries.add(_ListEntry.task(task));
      }
    } else {
      for (final task in filtered) {
        entries.add(_ListEntry.task(task));
      }
    }
    return entries;
  }

  List<MyTaskItem> get _filtered {
    final q = _searchCtrl.text.trim().toLowerCase();
    final list = _tasks.where((t) {
      switch (_tab) {
        case MyTasksTab.all:
          if (t.status == 'COMPLETED') return false;
          break;
        case MyTasksTab.todo:
          if (t.status != 'TODO' && t.status != 'BACKLOG') return false;
          break;
        case MyTasksTab.inProgress:
          if (t.status != 'IN_PROGRESS' && t.status != 'REVIEW') return false;
          break;
        case MyTasksTab.completed:
          if (t.status != 'COMPLETED') return false;
          break;
      }
      if (q.isEmpty) return true;
      return t.title.toLowerCase().contains(q) ||
          t.displayId.toLowerCase().contains(q) ||
          (t.location?.toLowerCase().contains(q) ?? false) ||
          (t.projectName?.toLowerCase().contains(q) ?? false);
    }).toList();

    switch (_controller.sort.value) {
      case MyTasksSort.byProject:
        list.sort((a, b) {
          final pa = (a.projectName ?? '').toLowerCase();
          final pb = (b.projectName ?? '').toLowerCase();
          final byProject = pa.compareTo(pb);
          if (byProject != 0) return byProject;
          final da = a.updatedAt ?? a.dueDate;
          final db = b.updatedAt ?? b.dueDate;
          if (da == null && db == null) return a.title.compareTo(b.title);
          if (da == null) return 1;
          if (db == null) return -1;
          return db.compareTo(da);
        });
      case MyTasksSort.byPriority:
        list.sort((a, b) {
          final byP = MyTasksController.priorityRank(a.priority)
              .compareTo(MyTasksController.priorityRank(b.priority));
          if (byP != 0) return byP;
          final da = a.dueDate;
          final db = b.dueDate;
          if (da == null && db == null) return a.title.compareTo(b.title);
          if (da == null) return 1;
          if (db == null) return -1;
          return da.compareTo(db);
        });
      case MyTasksSort.byDueSoon:
        list.sort((a, b) {
          final da = a.dueDate;
          final db = b.dueDate;
          if (da == null && db == null) {
            return MyTasksController.priorityRank(a.priority)
                .compareTo(MyTasksController.priorityRank(b.priority));
          }
          if (da == null) return 1;
          if (db == null) return -1;
          final byDue = da.compareTo(db);
          if (byDue != 0) return byDue;
          return MyTasksController.priorityRank(a.priority)
              .compareTo(MyTasksController.priorityRank(b.priority));
        });
      case MyTasksSort.byDueLatest:
        list.sort((a, b) {
          final da = a.dueDate;
          final db = b.dueDate;
          if (da == null && db == null) {
            return MyTasksController.priorityRank(a.priority)
                .compareTo(MyTasksController.priorityRank(b.priority));
          }
          if (da == null) return 1;
          if (db == null) return -1;
          final byDue = db.compareTo(da);
          if (byDue != 0) return byDue;
          return MyTasksController.priorityRank(a.priority)
              .compareTo(MyTasksController.priorityRank(b.priority));
        });
    }
    return list;
  }

  Future<void> _openSortSheet() async {
    final l10n = AppLocalizations.of(context)!;
    final current = _controller.sort.value;
    final chosen = await showModalBottomSheet<MyTasksSort>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                child: Text(
                  l10n.myTasksSortTitle,
                  style: Theme.of(ctx).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
              for (final option in MyTasksSort.values)
                ListTile(
                  leading: Icon(_sortIcon(option)),
                  title: Text(_sortLabel(l10n, option)),
                  trailing: current == option
                      ? Icon(Icons.check, color: Theme.of(ctx).colorScheme.primary)
                      : null,
                  onTap: () => Navigator.pop(ctx, option),
                ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
    if (chosen != null) {
      _controller.setSort(chosen);
    }
  }

  IconData _sortIcon(MyTasksSort sort) {
    switch (sort) {
      case MyTasksSort.byProject:
        return Icons.folder_outlined;
      case MyTasksSort.byPriority:
        return Icons.priority_high;
      case MyTasksSort.byDueSoon:
        return Icons.schedule;
      case MyTasksSort.byDueLatest:
        return Icons.event;
    }
  }

  String _sortLabel(AppLocalizations l10n, MyTasksSort sort) {
    switch (sort) {
      case MyTasksSort.byProject:
        return l10n.myTasksSortByProject;
      case MyTasksSort.byPriority:
        return l10n.myTasksSortByPriority;
      case MyTasksSort.byDueSoon:
        return l10n.myTasksSortByDueSoon;
      case MyTasksSort.byDueLatest:
        return l10n.myTasksSortByDueLatest;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).languageCode;
    final profile = Get.find<AuthController>().currentSession?.profile;

    return GetBuilder<MyTasksController>(
      builder: (c) {
      final loading = c.loading.value;
      final error = c.error.value;
      final entries = _listEntries;
      final showEmpty = _filtered.isEmpty;

      return Stack(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AppMobileTopBar(profile: profile),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                l10n.myTasksSubtitle,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ),
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
                          borderSide: BorderSide(
                            color: scheme.primary,
                            width: 2,
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          vertical: 12,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Material(
                    color: c.hasActiveSort
                        ? scheme.primaryContainer
                        : scheme.surfaceContainerHigh,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(
                        color: c.hasActiveSort
                            ? scheme.primary
                            : scheme.outlineVariant,
                      ),
                    ),
                    child: InkWell(
                      onTap: _openSortSheet,
                      borderRadius: BorderRadius.circular(12),
                      child: SizedBox(
                        width: 48,
                        height: 48,
                        child: Icon(
                          Icons.filter_list,
                          color: c.hasActiveSort
                              ? scheme.onPrimaryContainer
                              : scheme.primary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (c.hasActiveSort)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: InputChip(
                    avatar: Icon(_sortIcon(c.sort.value), size: 18),
                    label: Text(_sortLabel(l10n, c.sort.value)),
                    onDeleted: () => _controller.setSort(MyTasksSort.byProject),
                    deleteIconColor: scheme.onSurfaceVariant,
                  ),
                ),
              ),
            _StatusTabs(
              tab: _tab,
              onChanged: (t) => _controller.setTab(t),
              l10n: l10n,
            ),
            Expanded(
              child:
                  loading
                      ? const Center(child: CircularProgressIndicator())
                      : error != null
                      ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(error, textAlign: TextAlign.center),
                              const SizedBox(height: 12),
                              FilledButton(
                                onPressed: () => _controller.load(),
                                child: Text(l10n.dashboardRetry),
                              ),
                            ],
                          ),
                        ),
                      )
                      : showEmpty
                      ? Center(
                        child: Text(
                          l10n.myTasksEmpty,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      )
                      : RefreshIndicator(
                        onRefresh: () => _controller.load(),
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
                          itemCount: entries.length,
                          itemBuilder: (context, i) {
                            final entry = entries[i];
                            if (entry.isHeader) {
                              return Padding(
                                padding: EdgeInsets.only(
                                  top: i == 0 ? 4 : 18,
                                  bottom: 8,
                                ),
                                child: Text(
                                  entry.header!,
                                  style: theme.textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    color: scheme.primary,
                                  ),
                                ),
                              );
                            }
                            final task = entry.task!;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _TaskCard(
                                task: task,
                                locale: locale,
                                l10n: l10n,
                                onTap: () async {
                                  await context.push<bool>(
                                    '/tasks/${task.id}',
                                  );
                                  // Siempre refrescar: el back del sistema no
                                  // devuelve `true` aunque se haya cambiado el estado.
                                  if (mounted) await _controller.load(quiet: true);
                                },
                              ),
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
                await _controller.load();
              }
            },
            child: const Icon(Icons.add, size: 28),
          ),
        ),
      ],
    );
      },
    );
  }
}

class _ListEntry {
  const _ListEntry.header(this.header) : task = null;
  const _ListEntry.task(this.task) : header = null;

  final String? header;
  final MyTaskItem? task;

  bool get isHeader => header != null;
}

class _StatusTabs extends StatelessWidget {
  const _StatusTabs({
    required this.tab,
    required this.onChanged,
    required this.l10n,
  });

  final MyTasksTab tab;
  final ValueChanged<MyTasksTab> onChanged;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final tabs = [
      (l10n.myTasksTabAll, MyTasksTab.all),
      (l10n.myTasksTabTodo, MyTasksTab.todo),
      (l10n.myTasksTabInProgress, MyTasksTab.inProgress),
      (l10n.myTasksTabCompleted, MyTasksTab.completed),
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
    MyTasksTab value,
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

  final MyTaskItem task;
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
    final isOverdue =
        task.dueDate != null &&
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
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
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
                            icon:
                                isOverdue
                                    ? Icons.warning_amber_outlined
                                    : Icons.calendar_today_outlined,
                            label: dueLabel,
                            color:
                                isOverdue
                                    ? scheme.error
                                    : scheme.onSurfaceVariant.withValues(
                                      alpha: 0.7,
                                    ),
                          ),
                        if (task.hasSubtasks)
                          _MetaRow(
                            icon: Icons.checklist_outlined,
                            label: l10n.taskDetailSubtasksProgress(
                              task.subtaskCompleted,
                              task.subtaskTotal,
                            ),
                            color:
                                task.subtaskCompleted >= task.subtaskTotal
                                    ? scheme.tertiary
                                    : scheme.onSurfaceVariant.withValues(
                                      alpha: 0.8,
                                    ),
                          ),
                        if (task.isUnassigned)
                          _MetaRow(
                            icon: Icons.groups_outlined,
                            label: l10n.myTasksForEveryone,
                            color: scheme.primary,
                          ),
                        if (task.location != null && task.location!.isNotEmpty)
                          _MetaRow(
                            icon: Icons.location_on_outlined,
                            label: task.location!,
                            color: scheme.tertiary,
                          )
                        else if (task.projectName != null &&
                            task.projectName!.isNotEmpty)
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
              Icon(
                Icons.chevron_right,
                color: scheme.onSurfaceVariant.withValues(alpha: 0.4),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statusIcon(MyTaskItem task, ColorScheme scheme) {
    if (task.status == 'COMPLETED') {
      return Icon(Icons.check_circle, color: scheme.tertiary, size: 26);
    }
    final overdue =
        task.dueDate != null &&
        task.dueDate!.isBefore(DateTime.now()) &&
        task.status != 'COMPLETED';
    if (overdue || task.priority == 'CRITICAL') {
      return Icon(Icons.priority_high, color: scheme.error, size: 26);
    }
    if (task.status == 'IN_PROGRESS' || task.status == 'REVIEW') {
      return Icon(Icons.pending, color: scheme.tertiary, size: 26);
    }
    return Icon(
      Icons.radio_button_unchecked,
      color: scheme.primaryContainer,
      size: 26,
    );
  }

  String? _dueLabel(MyTaskItem task, String locale, AppLocalizations l10n) {
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
  const _MetaRow({
    required this.icon,
    required this.label,
    required this.color,
  });

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
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: color,
          ),
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
