import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/network/dio_provider.dart';
import '../../../core/offline/offline_providers.dart';
import '../../auth/application/auth_repository.dart';
import '../../evidence/application/evidence_upload_worker.dart';

final offlineCreateTaskServiceProvider = Provider<OfflineCreateTaskService>((ref) {
  return OfflineCreateTaskService(ref);
});

class OfflineCreateTaskService {
  OfflineCreateTaskService(this._ref);

  final Ref _ref;
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
    final assigneeId = _ref.read(authRepositoryProvider).valueOrNull?.profile?['id']?.toString();
    final body = <String, dynamic>{
      'title': title.trim(),
      'boardId': boardId,
      'priority': priority,
      if (description != null && description.isNotEmpty) 'description': description,
      if (location != null && location.isNotEmpty) 'location': location,
      if (assigneeId != null) 'assigneeId': assigneeId,
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
      body['description'] = body['description'] != null
          ? '${body['description']}\n\n$extra'
          : extra;
    }

    if (preferOnline) {
      final onlineResult = await _tryOnlineCreate(body, photoPaths);
      if (onlineResult != null) {
        return onlineResult;
      }
    }

    return _queueOffline(body, boardId, photoPaths);
  }

  Future<CreateTaskSaveResult?> _tryOnlineCreate(
    Map<String, dynamic> body,
    List<String> photoPaths,
  ) async {
    try {
      final dio = _ref.read(dioProvider);
      final res = await dio.post<Map<String, dynamic>>('/tasks', data: body);
      final data = res.data;
      final taskId = data?['id']?.toString();
      if (taskId != null && photoPaths.isNotEmpty) {
        final worker = _ref.read(evidenceUploadWorkerProvider);
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
      await _ref.read(outboxSyncServiceProvider).processQueue();
      return CreateTaskSaveResult(synced: true, taskId: taskId);
    } on DioException catch (_) {
      return null;
    }
  }

  Future<CreateTaskSaveResult> _queueOffline(
    Map<String, dynamic> body,
    String boardId,
    List<String> photoPaths,
  ) async {
    final clientTempId = 'local_${_uuid.v4()}';
    final queueBody = Map<String, dynamic>.from(body)..['clientTempId'] = clientTempId;

    await _ref.read(outboxSyncServiceProvider).enqueuePost('/tasks', queueBody);

    final local = _ref.read(localDataServiceProvider);
    final payload = <String, dynamic>{
      'id': clientTempId,
      'title': body['title'],
      'status': 'TODO',
      'priority': body['priority'],
      'boardId': boardId,
      'pendingSync': true,
    };
    await local.upsertCachedTask(
      id: clientTempId,
      boardId: boardId,
      title: '${body['title']}',
      status: 'TODO',
      payload: payload,
    );

    if (photoPaths.isNotEmpty) {
      final worker = _ref.read(evidenceUploadWorkerProvider);
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
