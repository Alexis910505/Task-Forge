import 'package:dio/dio.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:uuid/uuid.dart';

import '../../../core/network/dio_provider.dart';
import '../../../core/offline/local_data_service.dart';
import '../../../core/offline/outbox_sync_service.dart';
import '../../evidence/application/evidence_upload_worker.dart';

class OfflineCreateTaskService {
  const OfflineCreateTaskService();
  static const _uuid = Uuid();

  Future<CreateTaskSaveResult> save({
    required String boardId,
    required String title,
    required String priority,
    String? description,
    String? location,
    String? assetLabel,
    String? category,
    List<String> photoPaths = const [],
    bool preferOnline = true,
  }) async {
    // Sin assigneeId = visible para todos. Solo se asigna si el flujo lo indica.
    final body = <String, dynamic>{
      'title': title.trim(),
      'boardId': boardId,
      'priority': priority,
      // Por defecto las tareas raíz van a BACKLOG; en móvil las dejamos Por hacer.
      'status': 'TODO',
      if (description != null && description.isNotEmpty)
        'description': description,
      if (location != null && location.isNotEmpty) 'location': location,
    };

    final notes = <String>[];
    if (category != null && category.isNotEmpty) {
      notes.add('Categoría: $category');
    }
    if (assetLabel != null && assetLabel.isNotEmpty) {
      notes.add('Activo: $assetLabel');
    }
    if (notes.isNotEmpty) {
      final extra = notes.join('\n');
      body['description'] =
          body['description'] != null
              ? '${body['description']}\n\n$extra'
              : extra;
    }

    if (preferOnline) {
      try {
        return await _tryOnlineCreate(body, photoPaths);
      } on DioException catch (e) {
        if (!_isOfflineNetworkError(e)) {
          rethrow;
        }
      }
    }

    return _queueOffline(body, boardId, photoPaths);
  }

  bool _isOfflineNetworkError(DioException e) {
    return e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.response == null;
  }

  Future<CreateTaskSaveResult> _tryOnlineCreate(
    Map<String, dynamic> body,
    List<String> photoPaths,
  ) async {
    final dio = Get.find<ApiClient>().dio;
    final res = await dio.post<Map<String, dynamic>>('/tasks', data: body);
    final data = res.data;
    final taskId = data?['id']?.toString();
    if (taskId != null && photoPaths.isNotEmpty) {
      final worker = Get.find<EvidenceUploadWorker>();
      final captured = DateTime.now().toUtc().toIso8601String();
      for (final path in photoPaths) {
        await worker.enqueue(
          taskId: taskId,
          evidenceKind: 'BEFORE',
          localPath: path,
          capturedAtIso: captured,
        );
      }
    }
    await Get.find<OutboxSyncService>().processQueue();
    return CreateTaskSaveResult(synced: true, taskId: taskId);
  }

  Future<CreateTaskSaveResult> _queueOffline(
    Map<String, dynamic> body,
    String boardId,
    List<String> photoPaths,
  ) async {
    final clientTempId = 'local_${_uuid.v4()}';
    final queueBody = Map<String, dynamic>.from(body)
      ..['clientTempId'] = clientTempId;

    await Get.find<OutboxSyncService>().enqueuePost('/tasks', queueBody);

    final local = Get.find<LocalDataService>();
    final payload = <String, dynamic>{
      'id': clientTempId,
      'title': body['title'],
      'status': body['status'] ?? 'TODO',
      'priority': body['priority'],
      'boardId': boardId,
      'assigneeId': body['assigneeId'],
      'pendingSync': true,
    };
    await local.upsertCachedTask(
      id: clientTempId,
      boardId: boardId,
      title: '${body['title']}',
      status: '${body['status'] ?? 'TODO'}',
      payload: payload,
    );

    if (photoPaths.isNotEmpty) {
      final worker = Get.find<EvidenceUploadWorker>();
      final captured = DateTime.now().toUtc().toIso8601String();
      for (final path in photoPaths) {
        await worker.enqueue(
          taskId: clientTempId,
          evidenceKind: 'BEFORE',
          localPath: path,
          capturedAtIso: captured,
        );
      }
    }

    return CreateTaskSaveResult(synced: false, taskId: clientTempId);
  }
}

class CreateTaskSaveResult {
  const CreateTaskSaveResult({required this.synced, this.taskId});

  final bool synced;
  final String? taskId;
}
