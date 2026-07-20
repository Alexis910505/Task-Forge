import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/i18n/relative_time.dart';
import '../../../core/network/dio_provider.dart';
import '../../dashboard/presentation/activity_presentation.dart';
import '../presentation/task_status_presentation.dart';

class TaskActivityPage extends StatefulWidget {
  const TaskActivityPage({super.key, required this.taskId});

  final String taskId;

  @override
  State<TaskActivityPage> createState() => _TaskActivityPageState();
}

class _TaskActivityPageState extends State<TaskActivityPage> {
  Map<String, dynamic>? _task;
  List<Map<String, dynamic>> _timeline = [];
  String? _error;
  bool _loading = true;
  bool _commentSending = false;
  final _commentCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final dio = Get.find<ApiClient>().dio;
      final results = await Future.wait([
        dio.get<Map<String, dynamic>>('/tasks/${widget.taskId}'),
        dio.get<List<dynamic>>('/tasks/${widget.taskId}/timeline'),
      ]);
      final taskRes = results[0] as Response<Map<String, dynamic>>;
      final timelineRes = results[1] as Response<List<dynamic>>;
      final raw = timelineRes.data;
      final timeline =
          raw is List
              ? raw
                  .whereType<Map>()
                  .map((m) => Map<String, dynamic>.from(m))
                  .toList()
                  .reversed
                  .toList()
              : <Map<String, dynamic>>[];
      if (mounted) {
        setState(() {
          _task = taskRes.data;
          _timeline = timeline;
        });
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

  Future<void> _submitComment() async {
    final content = _commentCtrl.text.trim();
    if (content.isEmpty) return;
    setState(() => _commentSending = true);
    try {
      final dio = Get.find<ApiClient>().dio;
      await dio.post(
        '/tasks/${widget.taskId}/comments',
        data: {'content': content},
      );
      _commentCtrl.clear();
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              AppLocalizations.of(context)!.taskDetailCommentFailed,
            ),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _commentSending = false);
      }
    }
  }

  String _userName(Map<String, dynamic>? user) {
    if (user == null) return '—';
    final first = '${user['firstName'] ?? ''}'.trim();
    final last = '${user['lastName'] ?? ''}'.trim();
    final name = '$first $last'.trim();
    if (name.isNotEmpty) return name;
    return '${user['email'] ?? '—'}';
  }

  String _timelineBody(Map<String, dynamic> entry, AppLocalizations l10n) {
    final action = '${entry['action'] ?? ''}';
    final meta = entry['metadata'];
    final metaMap =
        meta is Map ? Map<String, dynamic>.from(meta) : <String, dynamic>{};

    if (action == 'comment.added') {
      final preview =
          '${metaMap['preview'] ?? metaMap['content'] ?? ''}'.trim();
      if (preview.isNotEmpty) return preview;
    }
    if (action == 'task.status_changed') {
      final to = '${metaMap['to'] ?? metaMap['status'] ?? ''}';
      if (to.isNotEmpty) {
        return l10n.taskActivityStatusChangedTo(to.replaceAll('_', ' '));
      }
    }
    if (action == 'task.assigned') {
      final assignee = metaMap['assignee'];
      if (assignee is Map) {
        return l10n.taskActivityAssignedTo(
          _userName(Map<String, dynamic>.from(assignee)),
        );
      }
    }
    if (action == 'attachment.added') {
      final count = metaMap['count'];
      if (count is num) {
        return l10n.taskActivityPhotosUploaded(count.toInt());
      }
    }
    return activityMessage(l10n, entry);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).languageCode;

    if (_loading) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: () => context.pop())),
        body: Center(child: CircularProgressIndicator(color: scheme.primary)),
      );
    }

    if (_error != null || _task == null) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: () => context.pop())),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _error ?? l10n.genericRequestError,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _load,
                  child: Text(l10n.dashboardRetry),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final task = _task!;
    final title = '${task['title'] ?? ''}';
    final status = '${task['status'] ?? 'TODO'}';
    final visual = taskStatusVisual(status, scheme, l10n);
    final board = task['board'];
    final projectLabel =
        board is Map ? '${board['name'] ?? board['title'] ?? ''}'.trim() : '';

    return Scaffold(
      backgroundColor: scheme.surface,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 4, 8, 0),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    icon: const Icon(Icons.arrow_back),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.appTitle,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: scheme.primary,
                          ),
                        ),
                        Text(
                          l10n.taskActivityLogTitle,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                            letterSpacing: 1.2,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: scheme.surfaceContainerLow,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: scheme.outlineVariant),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  title.isEmpty ? '—' : title,
                                  style: theme.textTheme.headlineSmall
                                      ?.copyWith(fontWeight: FontWeight.w600),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: scheme.tertiaryContainer,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  visual.label.toUpperCase(),
                                  style: theme.textTheme.labelSmall?.copyWith(
                                    color: scheme.onTertiaryContainer,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          if (projectLabel.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              l10n.taskActivityProject(projectLabel),
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    if (_timeline.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 32),
                        child: Text(
                          l10n.taskActivityEmpty,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      )
                    else
                      ...List.generate(_timeline.length, (i) {
                        final entry = _timeline[i];
                        final user =
                            entry['user'] is Map
                                ? Map<String, dynamic>.from(
                                  entry['user'] as Map,
                                )
                                : null;
                        final action = '${entry['action'] ?? ''}';
                        final visualEntry = activityVisual(action, scheme);
                        final createdAt = DateTime.tryParse(
                          '${entry['createdAt'] ?? ''}',
                        );
                        final timeLabel =
                            createdAt != null
                                ? formatRelativeTime(createdAt, locale)
                                : '';
                        final isComment = action == 'comment.added';
                        final body = _timelineBody(entry, l10n);
                        final isLast = i == _timeline.length - 1;

                        return _TimelineRow(
                          userName: _userName(user),
                          timeLabel: timeLabel,
                          body: body,
                          isComment: isComment,
                          visual: visualEntry,
                          isLast: isLast,
                        );
                      }),
                  ],
                ),
              ),
            ),
            Material(
              elevation: 8,
              color: scheme.surfaceContainerLow,
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                  child: Row(
                    children: [
                      Icon(Icons.attach_file, color: scheme.onSurfaceVariant),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _commentCtrl,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _submitComment(),
                          decoration: InputDecoration(
                            hintText: l10n.taskDetailCommentHint,
                            filled: true,
                            fillColor: scheme.surfaceContainerLow,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(999),
                              borderSide: BorderSide(color: scheme.outline),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Material(
                        color: scheme.primary,
                        shape: const CircleBorder(),
                        child: InkWell(
                          onTap: _commentSending ? null : _submitComment,
                          customBorder: const CircleBorder(),
                          child: SizedBox(
                            width: 44,
                            height: 44,
                            child:
                                _commentSending
                                    ? Padding(
                                      padding: const EdgeInsets.all(10),
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: scheme.onPrimary,
                                      ),
                                    )
                                    : Icon(
                                      Icons.send,
                                      color: scheme.onPrimary,
                                      size: 20,
                                    ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.userName,
    required this.timeLabel,
    required this.body,
    required this.isComment,
    required this.visual,
    required this.isLast,
  });

  final String userName;
  final String timeLabel;
  final String body;
  final bool isComment;
  final ActivityVisual visual;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 44,
            child: Column(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: visual.background,
                    shape: BoxShape.circle,
                    border: Border.all(color: scheme.outlineVariant),
                  ),
                  alignment: Alignment.center,
                  child: Icon(visual.icon, size: 20, color: visual.foreground),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(width: 2, color: scheme.outlineVariant),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          userName,
                          style: theme.textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      if (timeLabel.isNotEmpty)
                        Text(
                          timeLabel,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  if (isComment)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: scheme.surfaceContainerHighest.withValues(
                          alpha: 0.35,
                        ),
                        borderRadius: const BorderRadius.only(
                          topRight: Radius.circular(12),
                          bottomLeft: Radius.circular(12),
                          bottomRight: Radius.circular(12),
                        ),
                        border: Border.all(color: scheme.outlineVariant),
                      ),
                      child: Text(body, style: theme.textTheme.bodyMedium),
                    )
                  else
                    Text(
                      body,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
