import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/i18n/relative_time.dart';
import '../../../core/network/api_urls.dart';
import '../../../core/network/dio_provider.dart';
import '../../../core/realtime/realtime_service.dart';
import '../../my_tasks/application/my_tasks_controller.dart';
import 'task_detail_subtasks_section.dart';
import 'task_status_presentation.dart';

class TaskCommentVm {
  const TaskCommentVm({
    required this.id,
    required this.content,
    this.createdAt,
    this.authorName,
  });

  final String id;
  final String content;
  final DateTime? createdAt;
  final String? authorName;

  factory TaskCommentVm.fromJson(Map<String, dynamic> json) {
    final user = json['user'];
    String? author;
    if (user is Map) {
      final first = '${user['firstName'] ?? ''}'.trim();
      final last = '${user['lastName'] ?? ''}'.trim();
      final email = '${user['email'] ?? ''}'.trim();
      author = '$first $last'.trim();
      if (author.isEmpty) author = email.isEmpty ? null : email;
    }
    return TaskCommentVm(
      id: '${json['id'] ?? ''}',
      content: '${json['content'] ?? ''}'.trim(),
      createdAt: DateTime.tryParse('${json['createdAt'] ?? ''}'),
      authorName: author,
    );
  }
}

class TaskDetailController extends GetxController {
  TaskDetailController(this.taskId);

  final String taskId;
  final task = Rxn<Map<String, dynamic>>();
  final status = 'TODO'.obs;
  final statusUpdating = false.obs;
  final commentSending = false.obs;
  final comments = <TaskCommentVm>[].obs;
  final subtasks = <TaskSubtaskVm>[].obs;
  final subtaskSubmitting = false.obs;
  final subtaskSyncingIds = <String>{};
}

class TaskDetailMobilePage extends StatefulWidget {
  const TaskDetailMobilePage({super.key, required this.taskId});

  final String taskId;

  @override
  State<TaskDetailMobilePage> createState() => _TaskDetailMobilePageState();
}

class _TaskDetailMobilePageState extends State<TaskDetailMobilePage> {
  late final TaskDetailController _controller;
  Map<String, dynamic>? get _task => _controller.task.value;
  set _task(Map<String, dynamic>? value) => _controller.task.value = value;
  String? _error;
  bool _loading = true;
  RxString get _status => _controller.status;
  RxBool get _statusUpdating => _controller.statusUpdating;
  RxBool get _commentSending => _controller.commentSending;
  RxList<TaskCommentVm> get _comments => _controller.comments;
  RxList<TaskSubtaskVm> get _subtasks => _controller.subtasks;
  RxBool get _subtaskSubmitting => _controller.subtaskSubmitting;
  Set<String> get _subtaskSyncingIds => _controller.subtaskSyncingIds;
  final _commentCtrl = TextEditingController();
  final _subtaskCtrl = TextEditingController();
  StreamSubscription<Map<String, Object?>>? _realtimeSub;
  String? _joinedBoardSocketId;

  @override
  void initState() {
    super.initState();
    _controller = Get.put(
      TaskDetailController(widget.taskId),
      tag: widget.taskId,
    );
    _realtimeSub = Get.find<RealtimeService>().eventStream.listen(
      _onRealtimeEvent,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _realtimeSub?.cancel();
    final boardId = _joinedBoardSocketId;
    if (boardId != null) {
      Get.find<RealtimeService>().leaveBoard(boardId);
    }
    _commentCtrl.dispose();
    _subtaskCtrl.dispose();
    Get.delete<TaskDetailController>(tag: widget.taskId);
    super.dispose();
  }

  String get _displayId {
    final id = widget.taskId;
    if (id.length <= 8) return '#$id';
    return '#TF-${id.substring(id.length - 4).toUpperCase()}';
  }

  void _syncSocketBoard(String? boardId) {
    if (boardId == null || boardId.isEmpty) return;
    final rt = Get.find<RealtimeService>();
    if (_joinedBoardSocketId != null && _joinedBoardSocketId != boardId) {
      rt.leaveBoard(_joinedBoardSocketId!);
    }
    _joinedBoardSocketId = boardId;
    rt.joinBoard(boardId);
  }

  List<TaskSubtaskVm> _parseSubtasks(dynamic raw) {
    if (raw is! List) return [];
    return raw
        .whereType<Map>()
        .map((m) => TaskSubtaskVm.fromJson(Map<String, dynamic>.from(m)))
        .where((s) => s.id.isNotEmpty)
        .toList();
  }

  List<TaskCommentVm> _parseComments(dynamic raw) {
    if (raw is! List) return [];
    final parsed =
        raw
            .whereType<Map>()
            .map((m) => TaskCommentVm.fromJson(Map<String, dynamic>.from(m)))
            .where((c) => c.id.isNotEmpty && c.content.isNotEmpty)
            .toList();
    // API suele devolver desc; mostramos cronológico (más antiguo arriba).
    parsed.sort((a, b) {
      final at = a.createdAt?.millisecondsSinceEpoch ?? 0;
      final bt = b.createdAt?.millisecondsSinceEpoch ?? 0;
      return at.compareTo(bt);
    });
    return parsed;
  }

  void _upsertComment(TaskCommentVm comment) {
    if (comment.id.isEmpty || comment.content.isEmpty) return;
    final next = _comments.toList(growable: true);
    final i = next.indexWhere((c) => c.id == comment.id);
    if (i >= 0) {
      next[i] = comment;
    } else {
      next.add(comment);
    }
    next.sort((a, b) {
      final at = a.createdAt?.millisecondsSinceEpoch ?? 0;
      final bt = b.createdAt?.millisecondsSinceEpoch ?? 0;
      return at.compareTo(bt);
    });
    _comments.assignAll(next);
  }

  void _hydrateFromTask(Map<String, dynamic> data) {
    final board = data['board'];
    final boardId = board is Map ? board['id']?.toString() : null;
    _syncSocketBoard(boardId);
    _status.value = '${data['status'] ?? 'TODO'}';
    _subtasks.assignAll(_parseSubtasks(data['subtasks']));
    _comments.assignAll(_parseComments(data['comments']));
    _task = data;
  }

  /// Parche local: solo cambia el status de esa subtarea → no redibuja descripción/fotos.
  void _patchSubtaskStatus(String subtaskId, String nextStatus) {
    if (subtaskId.isEmpty) return;
    final current = _subtasks.toList(growable: false);
    final i = current.indexWhere((s) => s.id == subtaskId);
    if (i < 0) return;
    if (current[i].status == nextStatus) return;
    final next = List<TaskSubtaskVm>.from(current);
    next[i] = next[i].copyWith(status: nextStatus);
    _subtasks.assignAll(next);
  }

  void _onRealtimeEvent(Map<String, Object?> msg) {
    final name = msg['event'] as String?;
    if (name == null) return;
    final payload = msg['payload'];
    final map =
        payload is Map
            ? Map<String, Object?>.from(
              payload.map((k, v) => MapEntry('$k', v as Object?)),
            )
            : null;
    if (map == null) return;

    final taskId = map['taskId']?.toString();
    final parentTaskId = map['parentTaskId']?.toString();
    final type = map['type']?.toString();

    // Cambio de estado puntual → parche, sin GET ni setState de toda la página.
    if (name == 'task.status_changed') {
      final toStatus = map['toStatus']?.toString();
      if (toStatus == null || toStatus.isEmpty) return;

      if (taskId == widget.taskId) {
        if (_status.value != toStatus) _status.value = toStatus;
        // También el listado de Mis tareas en este y otros dispositivos.
        if (parentTaskId == null || parentTaskId.isEmpty) {
          MyTasksController.patchStatusIfRegistered(widget.taskId, toStatus);
        }
        return;
      }

      final isMySubtask = _subtasks.any((s) => s.id == taskId);
      final isChildOfThis = parentTaskId == widget.taskId;
      if (taskId != null && (isMySubtask || isChildOfThis)) {
        if (_subtaskSyncingIds.contains(taskId)) return;
        _patchSubtaskStatus(taskId, toStatus);
      } else if (taskId != null &&
          (parentTaskId == null || parentTaskId.isEmpty)) {
        MyTasksController.patchStatusIfRegistered(taskId, toStatus);
      }
      return;
    }

    // Alta/baja de subtareas: sincronizar solo la lista.
    if (name == 'task.updated' &&
        type == 'task.subtasks_updated' &&
        taskId == widget.taskId) {
      if (_subtaskSyncingIds.isNotEmpty) return;
      unawaited(_syncSubtasksOnly());
      return;
    }

    // Comentario en esta tarea: actualizar hilo bajo la descripción.
    if (name == 'comment.created' && taskId == widget.taskId) {
      final raw = map['comment'];
      if (raw is Map) {
        _upsertComment(TaskCommentVm.fromJson(Map<String, dynamic>.from(raw)));
      } else {
        unawaited(_syncCommentsOnly());
      }
      return;
    }
  }

  Future<void> _syncCommentsOnly() async {
    try {
      final dio = Get.find<ApiClient>().dio;
      final res = await dio.get<Map<String, dynamic>>(
        '/tasks/${widget.taskId}',
      );
      final data = res.data;
      if (!mounted || data == null) return;
      _comments.assignAll(_parseComments(data['comments']));
    } catch (_) {}
  }

  Future<void> _syncSubtasksOnly() async {
    try {
      final dio = Get.find<ApiClient>().dio;
      final res = await dio.get<Map<String, dynamic>>(
        '/tasks/${widget.taskId}',
      );
      final data = res.data;
      if (!mounted || data == null) return;
      if (_subtaskSyncingIds.isNotEmpty) return;
      _subtasks.assignAll(_parseSubtasks(data['subtasks']));
    } catch (_) {}
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final dio = Get.find<ApiClient>().dio;
      final res = await dio.get<Map<String, dynamic>>(
        '/tasks/${widget.taskId}',
      );
      if (mounted && res.data != null) {
        _hydrateFromTask(res.data!);
        setState(() {});
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

  bool _hasOpenSubtasks() => _subtasks.any((s) => !s.isDone);

  Future<void> _changeStatus(String status) async {
    if (_status.value == status) return;
    final isRoot = _task?['parentTask'] == null;
    if (isRoot && status == 'COMPLETED' && _hasOpenSubtasks()) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            AppLocalizations.of(
              context,
            )!.taskDetailCannotCompleteWithOpenSubtasks,
          ),
        ),
      );
      return;
    }
    final previous = _status.value;
    _status.value = status;
    _statusUpdating.value = true;
    try {
      final dio = Get.find<ApiClient>().dio;
      await dio.patch('/tasks/${widget.taskId}', data: {'status': status});
      // Actualiza el listado al instante (sin esperar a volver/recargar).
      MyTasksController.patchStatusIfRegistered(widget.taskId, status);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              AppLocalizations.of(context)!.taskDetailStatusUpdated,
            ),
          ),
        );
      }
    } catch (e) {
      _status.value = previous;
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(_formatError(e))));
      }
    } finally {
      _statusUpdating.value = false;
    }
  }

  Future<void> _submitSubtask() async {
    final title = _subtaskCtrl.text.trim();
    if (title.isEmpty || _task == null) return;
    final board = _task!['board'];
    final boardId = board is Map ? '${board['id'] ?? ''}' : '';
    _subtaskSubmitting.value = true;
    try {
      final dio = Get.find<ApiClient>().dio;
      final res = await dio.post<Map<String, dynamic>>(
        '/tasks',
        data: {
          'title': title,
          'parentTaskId': widget.taskId,
          if (boardId.isNotEmpty) 'boardId': boardId,
        },
      );
      _subtaskCtrl.clear();
      final created = res.data;
      if (created != null) {
        final item = TaskSubtaskVm.fromJson(created);
        if (item.id.isNotEmpty && !_subtasks.any((s) => s.id == item.id)) {
          _subtasks.add(item);
        } else {
          await _syncSubtasksOnly();
        }
      } else {
        await _syncSubtasksOnly();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(_formatError(e))));
      }
    } finally {
      _subtaskSubmitting.value = false;
    }
  }

  Future<void> _toggleSubtaskStatus(
    String subtaskId,
    String currentStatus,
  ) async {
    if (subtaskId.isEmpty || _subtaskSyncingIds.contains(subtaskId)) return;
    final next = currentStatus == 'COMPLETED' ? 'TODO' : 'COMPLETED';

    _patchSubtaskStatus(subtaskId, next);
    _subtaskSyncingIds.add(subtaskId);

    try {
      final dio = Get.find<ApiClient>().dio;
      await dio.patch('/tasks/$subtaskId', data: {'status': next});
    } catch (e) {
      if (!mounted) return;
      _patchSubtaskStatus(subtaskId, currentStatus);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(_formatError(e))));
    } finally {
      _subtaskSyncingIds.remove(subtaskId);
    }
  }

  Future<void> _submitComment() async {
    final content = _commentCtrl.text.trim();
    if (content.isEmpty) return;
    _commentSending.value = true;
    try {
      final dio = Get.find<ApiClient>().dio;
      final res = await dio.post<Map<String, dynamic>>(
        '/tasks/${widget.taskId}/comments',
        data: {'content': content},
      );
      _commentCtrl.clear();
      final created = res.data;
      if (created != null) {
        _upsertComment(TaskCommentVm.fromJson(created));
      } else {
        await _syncCommentsOnly();
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.taskDetailCommentSent),
          ),
        );
      }
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
      _commentSending.value = false;
    }
  }

  void _openStatusSheet() {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    final current = _status.value;
    final isSubtask = _task?['parentTask'] != null;
    final statuses = isSubtask ? const ['TODO', 'COMPLETED'] : kTaskStatuses;
    final blockCompleted = !isSubtask && _hasOpenSubtasks();
    showModalBottomSheet<void>(
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
                  l10n.taskDetailChangeStatus,
                  style: Theme.of(ctx).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (blockCompleted)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                  child: Text(
                    l10n.taskDetailCannotCompleteWithOpenSubtasks,
                    style: Theme.of(ctx).textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ),
              for (final status in statuses)
                ListTile(
                  enabled: !(blockCompleted && status == 'COMPLETED'),
                  leading: Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color:
                          isSubtask
                              ? (status == 'COMPLETED'
                                  ? scheme.tertiary
                                  : scheme.onSurfaceVariant)
                              : taskStatusVisual(status, scheme, l10n).dotColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  title: Text(
                    isSubtask
                        ? (status == 'COMPLETED'
                            ? l10n.taskDetailSubtaskDone
                            : l10n.taskDetailSubtaskTodo)
                        : taskStatusVisual(status, scheme, l10n).label,
                  ),
                  trailing:
                      (isSubtask
                              ? (status == 'COMPLETED'
                                  ? current == 'COMPLETED'
                                  : current != 'COMPLETED')
                              : current == status)
                          ? Icon(Icons.check, color: scheme.primary)
                          : (blockCompleted && status == 'COMPLETED')
                          ? Icon(
                            Icons.lock_outline,
                            size: 18,
                            color: scheme.onSurfaceVariant,
                          )
                          : null,
                  onTap:
                      (blockCompleted && status == 'COMPLETED')
                          ? null
                          : () {
                            Navigator.pop(ctx);
                            _changeStatus(status);
                          },
                ),
            ],
          ),
        );
      },
    );
  }

  List<Map<String, dynamic>> _evidencePhotos() {
    final attachments = _task?['attachments'];
    if (attachments is! List) return [];
    return attachments
        .whereType<Map>()
        .map((m) => Map<String, dynamic>.from(m))
        .where((a) {
          final kind = '${a['evidenceKind'] ?? ''}';
          if (kind == 'BEFORE' || kind == 'AFTER') return true;
          final mime = '${a['mimeType'] ?? ''}';
          final name = '${a['filename'] ?? ''}';
          return mime.startsWith('image/') ||
              RegExp(
                r'\.(jpe?g|png|webp|gif)$',
                caseSensitive: false,
              ).hasMatch(name);
        })
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;

    if (_loading) {
      return Scaffold(
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
    final isSubtaskView = task['parentTask'] != null;
    final description = '${task['description'] ?? ''}'.trim();
    final photos = _evidencePhotos();
    final parentTask = task['parentTask'];
    final isRootTask = parentTask == null;

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
                    onPressed: () => context.pop(true),
                    icon: const Icon(Icons.arrow_back),
                  ),
                  Expanded(
                    child: Text(
                      title.isEmpty ? l10n.myTasksTitle : title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: scheme.primary,
                      ),
                    ),
                  ),
                  IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l10n.taskDetailTaskId(_displayId),
                              style: theme.textTheme.labelSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.6,
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Obx(() {
                              final status = _status.value;
                              final done = status == 'COMPLETED';
                              final visual =
                                  isSubtaskView
                                      ? TaskStatusVisual(
                                        label:
                                            done
                                                ? l10n.taskDetailSubtaskDone
                                                : l10n.taskDetailSubtaskTodo,
                                        color:
                                            done
                                                ? scheme.tertiary
                                                : scheme.onSurfaceVariant,
                                        dotColor:
                                            done
                                                ? scheme.tertiary
                                                : scheme.onSurfaceVariant,
                                      )
                                      : taskStatusVisual(status, scheme, l10n);
                              return Row(
                                children: [
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(
                                      color: visual.dotColor,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    visual.label.toUpperCase(),
                                    style: theme.textTheme.labelSmall?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.8,
                                      color: visual.color,
                                    ),
                                  ),
                                ],
                              );
                            }),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Obx(() {
                        final updating = _statusUpdating.value;
                        return FilledButton.tonal(
                          onPressed: updating ? null : _openStatusSheet,
                          style: FilledButton.styleFrom(
                            backgroundColor: scheme.secondaryContainer,
                            foregroundColor: scheme.onSecondaryContainer,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 10,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (updating)
                                SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: scheme.onSecondaryContainer,
                                  ),
                                )
                              else ...[
                                Text(
                                  l10n.taskDetailChangeStatus,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.4,
                                  ),
                                ),
                                const Icon(Icons.expand_more, size: 18),
                              ],
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                  if (parentTask is Map) ...[
                    const SizedBox(height: 16),
                    InkWell(
                      onTap: () => context.push('/tasks/${parentTask['id']}'),
                      child: Row(
                        children: [
                          Icon(
                            Icons.subdirectory_arrow_right,
                            size: 18,
                            color: scheme.primary,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              '${l10n.taskDetailParentTask}: ${parentTask['title'] ?? ''}',
                              style: theme.textTheme.bodySmall?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: scheme.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  OutlinedButton.icon(
                    onPressed:
                        () => context.push('/tasks/${widget.taskId}/activity'),
                    icon: const Icon(Icons.history, size: 18),
                    label: Text(l10n.taskDetailActivityLog),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(44),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  Text(
                    l10n.taskDetailDescription,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: scheme.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: scheme.outlineVariant),
                    ),
                    child: Text(
                      description.isEmpty
                          ? l10n.taskDetailNoDescription
                          : description,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: scheme.onSurfaceVariant,
                        height: 1.45,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Obx(() {
                    final comments = _comments.toList(growable: false);
                    final locale = Localizations.localeOf(context).languageCode;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              l10n.taskDetailComments,
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if (comments.isNotEmpty) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: scheme.primaryContainer,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  '${comments.length}',
                                  style: theme.textTheme.labelSmall?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    color: scheme.onPrimaryContainer,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 10),
                        if (comments.isEmpty)
                          Text(
                            l10n.taskDetailNoComments,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: scheme.onSurfaceVariant,
                            ),
                          )
                        else
                          ...comments.map((c) {
                            final when =
                                c.createdAt != null
                                    ? formatRelativeTime(c.createdAt!, locale)
                                    : '';
                            final who =
                                (c.authorName == null || c.authorName!.isEmpty)
                                    ? '—'
                                    : c.authorName!;
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: scheme.surfaceContainerLow,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: scheme.outlineVariant,
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            who,
                                            style: theme.textTheme.labelLarge
                                                ?.copyWith(
                                                  fontWeight: FontWeight.w700,
                                                ),
                                          ),
                                        ),
                                        if (when.isNotEmpty)
                                          Text(
                                            when,
                                            style: theme.textTheme.labelSmall
                                                ?.copyWith(
                                                  color:
                                                      scheme.onSurfaceVariant,
                                                ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      c.content,
                                      style: theme.textTheme.bodyMedium
                                          ?.copyWith(
                                            color: scheme.onSurface,
                                            height: 1.4,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }),
                      ],
                    );
                  }),
                  if (isRootTask)
                    TaskDetailSubtasksSection(
                      subtasks: _subtasks,
                      submitting: _subtaskSubmitting,
                      controller: _subtaskCtrl,
                      onToggle: _toggleSubtaskStatus,
                      onSubmit: _submitSubtask,
                    ),
                  const SizedBox(height: 28),
                  SizedBox(
                    width: double.infinity,
                    height: 96,
                    child: FilledButton(
                      onPressed: () async {
                        await context.push('/tasks/${widget.taskId}/evidence');
                        if (mounted) await _load();
                      },
                      style: FilledButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.add_a_photo_outlined, size: 32),
                          const SizedBox(height: 6),
                          Text(
                            l10n.taskDetailAddEvidence,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        l10n.taskDetailEvidenceGallery,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        l10n.taskDetailPhotosCount(photos.length),
                        style: theme.textTheme.labelSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (photos.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(24),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        border: Border.all(color: scheme.outlineVariant),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        l10n.taskDetailNoPhotos,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    )
                  else
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                      itemCount: photos.length,
                      itemBuilder: (context, i) {
                        final url = resolveUploadUrl(
                          '${photos[i]['url'] ?? ''}',
                        );
                        return ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            decoration: BoxDecoration(
                              border: Border.all(color: scheme.outlineVariant),
                            ),
                            child: Image.network(
                              url,
                              fit: BoxFit.cover,
                              errorBuilder:
                                  (_, __, ___) => ColoredBox(
                                    color: scheme.surfaceContainerHigh,
                                    child: Icon(
                                      Icons.broken_image_outlined,
                                      color: scheme.onSurfaceVariant,
                                    ),
                                  ),
                            ),
                          ),
                        );
                      },
                    ),
                ],
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
                      Expanded(
                        child: TextField(
                          controller: _commentCtrl,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _submitComment(),
                          decoration: InputDecoration(
                            hintText: l10n.taskDetailCommentHint,
                            filled: true,
                            fillColor: scheme.surface,
                            prefixIcon: Icon(
                              Icons.comment_outlined,
                              color: scheme.onSurfaceVariant,
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(999),
                              borderSide: BorderSide(color: scheme.outline),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(999),
                              borderSide: BorderSide(color: scheme.outline),
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              vertical: 12,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Obx(() {
                        final sending = _commentSending.value;
                        return Material(
                          color: scheme.primaryContainer,
                          shape: const CircleBorder(),
                          child: InkWell(
                            onTap: sending ? null : _submitComment,
                            customBorder: const CircleBorder(),
                            child: SizedBox(
                              width: 48,
                              height: 48,
                              child:
                                  sending
                                      ? Padding(
                                        padding: const EdgeInsets.all(12),
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: scheme.onPrimaryContainer,
                                        ),
                                      )
                                      : Icon(
                                        Icons.send,
                                        color: scheme.onPrimaryContainer,
                                      ),
                            ),
                          ),
                        );
                      }),
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
