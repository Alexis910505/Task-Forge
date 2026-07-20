import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;

import '../../../core/network/dio_provider.dart';
import '../../../core/offline/local_data_service.dart';
import '../../../core/offline/outbox_sync_service.dart';
import '../../../core/realtime/realtime_service.dart';
import '../../auth/application/auth_repository.dart';

enum MyTasksTab { all, todo, inProgress, completed }

/// Orden del listado (además del filtro por estado).
enum MyTasksSort {
  /// Agrupa por proyecto (comportamiento por defecto).
  byProject,
  /// Criticidad: CRITICAL → LOW.
  byPriority,
  /// Vence antes primero (sin fecha al final).
  byDueSoon,
  /// Vence más tarde primero.
  byDueLatest,
}

class MyTaskItem {
  MyTaskItem({
    required this.id,
    required this.title,
    required this.status,
    required this.priority,
    this.dueDate,
    this.location,
    this.projectName,
    this.updatedAt,
    this.assigneeId,
    this.parentTaskId,
    this.subtaskTotal = 0,
    this.subtaskCompleted = 0,
  });

  final String id;
  final String title;
  final String status;
  final String priority;
  final DateTime? dueDate;
  final String? location;
  final String? projectName;
  final DateTime? updatedAt;
  final String? assigneeId;
  final String? parentTaskId;
  final int subtaskTotal;
  final int subtaskCompleted;

  bool get isUnassigned => assigneeId == null || assigneeId!.isEmpty;
  bool get isRoot => parentTaskId == null || parentTaskId!.isEmpty;
  bool get hasSubtasks => subtaskTotal > 0;

  MyTaskItem copyWith({
    String? projectName,
    String? status,
    DateTime? updatedAt,
    int? subtaskTotal,
    int? subtaskCompleted,
  }) {
    return MyTaskItem(
      id: id,
      title: title,
      status: status ?? this.status,
      priority: priority,
      dueDate: dueDate,
      location: location,
      projectName: projectName ?? this.projectName,
      updatedAt: updatedAt ?? this.updatedAt,
      assigneeId: assigneeId,
      parentTaskId: parentTaskId,
      subtaskTotal: subtaskTotal ?? this.subtaskTotal,
      subtaskCompleted: subtaskCompleted ?? this.subtaskCompleted,
    );
  }

  String get displayId {
    if (id.length <= 8) return '#$id';
    return '#TF-${id.substring(id.length - 4).toUpperCase()}';
  }

  factory MyTaskItem.fromJson(Map<String, dynamic> json) {
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

    final assignee = json['assignee'];
    String? assigneeId = json['assigneeId']?.toString();
    if ((assigneeId == null || assigneeId.isEmpty) && assignee is Map) {
      assigneeId = assignee['id']?.toString();
    }

    final parent = json['parentTask'];
    String? parentTaskId = json['parentTaskId']?.toString();
    if ((parentTaskId == null || parentTaskId.isEmpty) && parent is Map) {
      parentTaskId = parent['id']?.toString();
    }

    var subTotal = 0;
    var subDone = 0;
    final progress = json['subtaskProgress'];
    if (progress is Map) {
      subTotal = (progress['total'] as num?)?.toInt() ?? 0;
      subDone = (progress['completed'] as num?)?.toInt() ?? 0;
    } else {
      final count = json['_count'];
      if (count is Map) {
        subTotal = (count['subtasks'] as num?)?.toInt() ?? 0;
      }
      final subs = json['subtasks'];
      if (subs is List) {
        subTotal = subs.length;
        subDone =
            subs.where((s) => s is Map && '${s['status']}' == 'COMPLETED').length;
      }
    }

    return MyTaskItem(
      id: '${json['id'] ?? ''}',
      title: '${json['title'] ?? ''}',
      status: '${json['status'] ?? 'TODO'}',
      priority: '${json['priority'] ?? 'MEDIUM'}',
      dueDate: parseDate(json['dueDate']),
      location: json['location']?.toString(),
      projectName: project,
      updatedAt: parseDate(json['updatedAt']),
      assigneeId: assigneeId,
      parentTaskId: parentTaskId,
      subtaskTotal: subTotal,
      subtaskCompleted: subDone,
    );
  }
}

/// Estado permanente de "Mis tareas" + sync websocket (igual espíritu que subtareas).
class MyTasksController extends GetxController {
  final tab = MyTasksTab.all.obs;
  final sort = MyTasksSort.byProject.obs;
  final tasks = <MyTaskItem>[].obs;
  final error = Rxn<String>();
  final loading = false.obs;
  final listEpoch = 0.obs;

  bool get hasActiveSort => sort.value != MyTasksSort.byProject;

  StreamSubscription<Map<String, Object?>>? _realtimeSub;
  Timer? _reloadDebounce;
  Worker? _authWorker;
  bool _loadedOnce = false;

  static MyTasksController get instance => Get.find<MyTasksController>();

  static void patchStatusIfRegistered(String taskId, String status) {
    if (!Get.isRegistered<MyTasksController>()) return;
    instance.patchStatus(taskId, status);
  }

  static void requestQuietReloadIfRegistered() {
    if (!Get.isRegistered<MyTasksController>()) return;
    instance.scheduleReload(quiet: true);
  }

  @override
  void onInit() {
    super.onInit();
    _realtimeSub = Get.find<RealtimeService>().eventStream.listen(_onRealtime);
    _authWorker = ever<AuthSession?>(Get.find<AuthController>().session, (s) {
      if (s != null && !_loadedOnce) {
        unawaited(load(quiet: false));
      }
    });
    if (Get.find<AuthController>().isLoggedIn) {
      unawaited(load(quiet: false));
    }
  }

  @override
  void onClose() {
    _reloadDebounce?.cancel();
    _realtimeSub?.cancel();
    _authWorker?.dispose();
    super.onClose();
  }

  void _notifyUi() {
    listEpoch.value++;
    update();
  }

  void setTab(MyTasksTab value) {
    if (tab.value == value) return;
    tab.value = value;
    _notifyUi();
  }

  void setSort(MyTasksSort value) {
    if (sort.value == value) return;
    sort.value = value;
    _notifyUi();
  }

  static int priorityRank(String priority) {
    switch (priority.toUpperCase()) {
      case 'CRITICAL':
        return 0;
      case 'HIGH':
        return 1;
      case 'MEDIUM':
        return 2;
      case 'LOW':
        return 3;
      default:
        return 4;
    }
  }

  void patchStatus(String taskId, String status) {
    final i = tasks.indexWhere((t) => t.id == taskId);
    if (i < 0) {
      // No está en memoria → recargar desde API (otra persona / nuevo filtro).
      scheduleReload(quiet: true);
      return;
    }
    if (tasks[i].status == status) return;
    final next = List<MyTaskItem>.from(tasks);
    next[i] = next[i].copyWith(status: status, updatedAt: DateTime.now());
    tasks.assignAll(next);
    _notifyUi();
    if (kDebugMode) {
      debugPrint('[my-tasks] patch $taskId → $status');
    }
  }

  void scheduleReload({bool quiet = true}) {
    _reloadDebounce?.cancel();
    _reloadDebounce = Timer(const Duration(milliseconds: 280), () {
      unawaited(load(quiet: quiet));
    });
  }

  void _onRealtime(Map<String, Object?> msg) {
    final name = msg['event'] as String?;
    final payload = _payloadMap(msg['payload']);
    if (name == null || payload == null) return;

    if (name == 'task.status_changed') {
      final taskId = payload['taskId']?.toString();
      final toStatus = payload['toStatus']?.toString();
      final parentTaskId = payload['parentTaskId']?.toString();
      if (taskId == null || toStatus == null) return;

      if (parentTaskId == null || parentTaskId.isEmpty) {
        // Igual que subtareas: parche local inmediato + confirmación por API.
        patchStatus(taskId, toStatus);
        scheduleReload(quiet: true);
      } else {
        scheduleReload(quiet: true);
      }
      return;
    }

    if (name == 'task.created' ||
        name == 'task.assigned' ||
        name == 'task.updated' ||
        name == 'kanban.card_moved') {
      scheduleReload(quiet: true);
    }
  }

  Future<void> load({bool quiet = false}) async {
    final auth = Get.find<AuthController>();
    final userId = auth.currentUserId;
    if (userId == null) return;

    if (!quiet) {
      loading.value = true;
    }
    error.value = null;
    try {
      await Get.find<OutboxSyncService>().processQueue();
      final dio = Get.find<ApiClient>().dio;

      final rows = await _fetchTaskMaps(dio, {'rootOnly': 'true'});
      var items = rows
          .map(MyTaskItem.fromJson)
          .where((t) => t.isRoot && (t.isUnassigned || t.assigneeId == userId))
          .toList();

      if (items.isEmpty) {
        final worklist = await _fetchTaskMaps(dio, {
          'worklistFor': userId,
          'rootOnly': 'true',
        });
        items = worklist.map(MyTaskItem.fromJson).where((t) => t.isRoot).toList();
      }
      if (items.isEmpty) {
        items = (await _loadFromAllProjects(dio, userId)).where((t) => t.isRoot).toList();
      }

      final pending = await Get.find<LocalDataService>().pendingLocalTasks(
        assigneeId: userId,
        includeUnassigned: true,
      );
      final known = items.map((t) => t.id).toSet();
      for (final p in pending) {
        final id = '${p['id'] ?? ''}';
        final parentId = p['parentTaskId']?.toString();
        if (id.isEmpty || known.contains(id)) continue;
        if (parentId != null && parentId.isNotEmpty) continue;
        items.insert(0, MyTaskItem.fromJson(p));
      }

      items.sort((a, b) {
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

      tasks.assignAll(items);
      _loadedOnce = true;
      _notifyUi();
    } catch (e) {
      error.value = _formatError(e);
      _notifyUi();
    } finally {
      loading.value = false;
      _notifyUi();
    }
  }

  Future<List<Map<String, dynamic>>> _fetchTaskMaps(
    Dio dio,
    Map<String, dynamic> query,
  ) async {
    final res = await dio.get<dynamic>('/tasks', queryParameters: query);
    final raw = res.data;
    if (raw is List) {
      return raw.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList();
    }
    if (raw is Map && raw['data'] is List) {
      return (raw['data'] as List)
          .whereType<Map>()
          .map((m) => Map<String, dynamic>.from(m))
          .toList();
    }
    return [];
  }

  Future<List<MyTaskItem>> _loadFromAllProjects(Dio dio, String userId) async {
    final byId = <String, MyTaskItem>{};
    final projectsRes = await dio.get<dynamic>('/projects');
    final projects = projectsRes.data;
    if (projects is! List) return [];

    final boardIds = <String>[];
    final projectNames = <String, String>{};
    for (final p in projects) {
      if (p is! Map) continue;
      final projectName = '${p['name'] ?? ''}';
      final boards = p['boards'];
      if (boards is! List) continue;
      for (final b in boards) {
        if (b is! Map) continue;
        final boardId = '${b['id'] ?? ''}';
        if (boardId.isEmpty) continue;
        boardIds.add(boardId);
        projectNames[boardId] =
            projectName.isNotEmpty ? projectName : '${b['name'] ?? ''}';
      }
    }

    await Future.wait(
      boardIds.map((boardId) async {
        try {
          final rows = await _fetchTaskMaps(dio, {
            'boardId': boardId,
            'rootOnly': 'true',
          });
          for (final map in rows) {
            final item = MyTaskItem.fromJson(map);
            if (!item.isRoot) continue;
            if (!(item.isUnassigned || item.assigneeId == userId)) continue;
            final enriched = item.projectName == null || item.projectName!.isEmpty
                ? item.copyWith(projectName: projectNames[boardId])
                : item;
            byId[enriched.id] = enriched;
          }
        } catch (_) {}
      }),
    );
    return byId.values.toList();
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

  static Map<String, Object?>? _payloadMap(Object? raw) {
    var data = raw;
    if (data is List && data.isNotEmpty) data = data.first;
    if (data is Map) {
      return Map<String, Object?>.from(
        data.map((k, v) => MapEntry('$k', v as Object?)),
      );
    }
    return null;
  }
}
