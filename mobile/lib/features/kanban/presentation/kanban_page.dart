import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/dio_provider.dart';
import '../../../core/offline/board_map_mutations.dart';
import '../../../core/offline/offline_providers.dart';
import '../../../core/realtime/realtime_providers.dart';

class KanbanPage extends ConsumerStatefulWidget {
  const KanbanPage({super.key});

  @override
  ConsumerState<KanbanPage> createState() => _KanbanPageState();
}

class _KanbanPageState extends ConsumerState<KanbanPage> {
  final _boardId = TextEditingController();
  Map<String, dynamic>? _board;
  String? _error;
  bool _loading = false;
  bool _fromCache = false;
  String? _joinedBoardSocketId;
  StreamSubscription<Map<String, Object?>>? _realtimeSub;
  bool _realtimeHooked = false;

  static const _kanbanRealtimeEvents = {
    'task.created',
    'task.status_changed',
    'task.assigned',
    'comment.created',
    'kanban.card_moved',
    'task.updated',
  };

  void _onRealtimeEvent(Map<String, Object?> msg) {
    final name = msg['event'] as String?;
    if (name == null || !_kanbanRealtimeEvents.contains(name)) {
      return;
    }
    final boardId = _boardId.text.trim();
    if (boardId.isEmpty) {
      return;
    }
    final payload = msg['payload'] as Map<String, Object?>?;
    final bid = payload?['boardId']?.toString();
    if (bid != null && bid != boardId) {
      return;
    }
    if (mounted) {
      _load();
    }
  }

  @override
  void dispose() {
    _realtimeSub?.cancel();
    if (_joinedBoardSocketId != null) {
      ref.read(realtimeServiceProvider).leaveBoard(_joinedBoardSocketId!);
    }
    _boardId.dispose();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_realtimeHooked) {
      _realtimeHooked = true;
      _realtimeSub = ref.read(realtimeServiceProvider).eventStream.listen(_onRealtimeEvent);
    }
  }

  void _syncSocketBoard(String id) {
    final rt = ref.read(realtimeServiceProvider);
    if (_joinedBoardSocketId != null && _joinedBoardSocketId != id) {
      rt.leaveBoard(_joinedBoardSocketId!);
    }
    _joinedBoardSocketId = id;
    rt.joinBoard(id);
  }

  bool _isLikelyOnline() {
    return ref.read(connectivityProvider).maybeWhen(
          data: connectivityLooksOnline,
          orElse: () => true,
        );
  }

  bool _isOfflineNetworkError(Object e) {
    if (e is DioException) {
      return e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout;
    }
    return false;
  }

  String _formatError(Object e) {
    if (e is DioException) {
      return e.message ?? '$e';
    }
    return '$e';
  }

  Future<void> _load() async {
    final id = _boardId.text.trim();
    if (id.isEmpty) {
      final l10n = AppLocalizations.of(context)!;
      setState(() => _error = l10n.kanbanBoardIdRequired);
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(outboxSyncServiceProvider).processQueue();
      final dio = ref.read(dioProvider);
      final res = await dio.get<Map<String, dynamic>>('/boards/$id');
      final data = res.data;
      if (data != null) {
        final local = ref.read(localDataServiceProvider);
        await local.saveBoard(id, data);
        await local.saveDefaultBoardId(id);
        if (mounted) {
          setState(() {
            _board = data;
            _fromCache = false;
          });
          _syncSocketBoard(id);
        }
      }
    } catch (e) {
      final cached = await ref.read(localDataServiceProvider).readBoard(id);
      if (cached != null) {
        if (mounted) {
          setState(() {
            _board = cached;
            _error = null;
            _fromCache = true;
          });
          _syncSocketBoard(id);
        }
      } else if (mounted) {
        setState(() => _error = _formatError(e));
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _applyOptimisticMoveAndQueue({
    required String boardId,
    required String taskId,
    required String newStatus,
  }) async {
    final board = _board;
    if (board == null) {
      return;
    }
    final next = applyOfflineTaskStatusMove(
      board: board,
      taskId: taskId,
      newStatus: newStatus,
    );
    setState(() => _board = next);
    await ref.read(localDataServiceProvider).saveBoard(boardId, next);
    await ref.read(outboxSyncServiceProvider).enqueuePatch(
          '/tasks/$taskId',
          {'status': newStatus},
        );
    if (mounted) {
      final l10n = AppLocalizations.of(context)!;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(l10n.kanbanOfflineSaved),
        ),
      );
    }
  }

  Future<void> _moveTask(String taskId, String newStatus) async {
    final boardId = _boardId.text.trim();
    if (boardId.isEmpty) {
      return;
    }

    final online = _isLikelyOnline();
    if (!online) {
      await _applyOptimisticMoveAndQueue(
        boardId: boardId,
        taskId: taskId,
        newStatus: newStatus,
      );
      return;
    }

    try {
      final dio = ref.read(dioProvider);
      await dio.patch<dynamic>('/tasks/$taskId', data: {'status': newStatus});
      await ref.read(outboxSyncServiceProvider).processQueue();
      await _load();
    } catch (e) {
      if (_isOfflineNetworkError(e)) {
        await _applyOptimisticMoveAndQueue(
          boardId: boardId,
          taskId: taskId,
          newStatus: newStatus,
        );
      } else if (mounted) {
        final l10n = AppLocalizations.of(context)!;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.kanbanMoveFailed(_formatError(e)))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _boardId,
                  decoration: InputDecoration(
                    labelText: l10n.kanbanBoardId,
                    hintText: l10n.kanbanLoadHint,
                    border: const OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: _loading ? null : _load,
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(l10n.kanbanLoad),
              ),
            ],
          ),
          if (_fromCache) ...[
            const SizedBox(height: 8),
            ListTile(
              dense: true,
              leading: Icon(Icons.cloud_off_outlined, color: theme.colorScheme.primary),
              title: Text(l10n.kanbanCachedTitle),
              subtitle: Text(l10n.kanbanCachedSubtitle),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
          ],
          const SizedBox(height: 12),
          Expanded(
            child: _board == null
                ? Center(
                    child: Text(
                      l10n.kanbanEmptyState,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  )
                : KanbanBoardView(
                    board: _board!,
                    onDropTask: _moveTask,
                  ),
          ),
        ],
      ),
    );
  }
}

class KanbanBoardView extends StatelessWidget {
  const KanbanBoardView({
    super.key,
    required this.board,
    required this.onDropTask,
  });

  final Map<String, dynamic> board;
  final Future<void> Function(String taskId, String newStatus) onDropTask;

  @override
  Widget build(BuildContext context) {
    final columns = (board['columns'] as List?) ?? [];
    return LayoutBuilder(
      builder: (context, c) {
        return Scrollbar(
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: columns.map((col) {
              final m = col as Map<String, dynamic>;
              final status = '${m['status']}';
              final tasks = (m['tasks'] as List?) ?? [];
              return SizedBox(
                width: c.maxWidth > 520 ? 320 : c.maxWidth * 0.86,
                child: Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: DragTarget<String>(
                    onAcceptWithDetails: (details) => onDropTask(details.data, status),
                    builder: (context, candidate, _) {
                      final active = candidate.isNotEmpty;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: active
                                ? Theme.of(context).colorScheme.primary
                                : Theme.of(context).dividerColor,
                          ),
                          color: Theme.of(context)
                              .colorScheme
                              .surfaceContainerHighest
                              .withValues(alpha: 0.35),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Padding(
                              padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      status,
                                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                            fontWeight: FontWeight.w600,
                                          ),
                                    ),
                                  ),
                                  Chip(label: Text('${tasks.length}')),
                                ],
                              ),
                            ),
                            Expanded(
                              child: ListView.builder(
                                padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                                itemCount: tasks.length,
                                itemBuilder: (context, i) {
                                  final t = tasks[i] as Map<String, dynamic>;
                                  final id = '${t['id']}';
                                  final title = '${t['title']}';
                                  return LongPressDraggable<String>(
                                    data: id,
                                    feedback: Material(
                                      elevation: 4,
                                      borderRadius: BorderRadius.circular(8),
                                      child: SizedBox(
                                        width: 260,
                                        child: ListTile(
                                          title: Text(title),
                                          tileColor: Theme.of(context).colorScheme.surface,
                                        ),
                                      ),
                                    ),
                                    childWhenDragging:
                                        Opacity(opacity: 0.4, child: _TaskTile(title: title, taskId: id)),
                                    child: _TaskTile(title: title, taskId: id),
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              );
            }).toList(),
          ),
        );
      },
    );
  }
}

class _TaskTile extends StatelessWidget {
  const _TaskTile({required this.title, required this.taskId});

  final String title;
  final String taskId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        dense: true,
        title: Text(title, maxLines: 3, overflow: TextOverflow.ellipsis),
        trailing: IconButton(
          tooltip: l10n.kanbanEvidenceTooltip,
          icon: const Icon(Icons.photo_camera_outlined, size: 20),
          onPressed: () => context.push('/tasks/$taskId/evidence'),
        ),
      ),
    );
  }
}
