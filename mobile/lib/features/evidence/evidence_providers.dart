import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/offline/app_database.dart';
import '../../core/offline/database_provider.dart';

/// Cola local de evidencias pendientes para una tarea.
final evidenceQueueForTaskProvider =
    StreamProvider.family<List<EvidenceUploadQueueData>, String>((ref, taskId) {
  final db = ref.watch(appDatabaseProvider);
  return (db.select(db.evidenceUploadQueue)..where((t) => t.taskId.equals(taskId))).watch();
});

/// Total de fotos de evidencia pendientes de subir (toda la app).
final pendingEvidenceCountProvider = StreamProvider<int>((ref) {
  final db = ref.watch(appDatabaseProvider);
  return db.select(db.evidenceUploadQueue).watch().map((r) => r.length);
});
