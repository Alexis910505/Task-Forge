import 'package:get/get.dart';

import '../../core/offline/app_database.dart';

export '../../core/offline/app_database.dart' show EvidenceUploadQueueData;

/// Cola local de evidencias pendientes para una tarea.
Stream<List<EvidenceUploadQueueData>> evidenceQueueForTask(String taskId) {
  final db = Get.find<AppDatabase>();
  return (db.select(db.evidenceUploadQueue)
    ..where((t) => t.taskId.equals(taskId))).watch();
}

/// Total de fotos de evidencia pendientes de subir (toda la app).
Stream<int> pendingEvidenceCount() {
  final db = Get.find<AppDatabase>();
  return db.select(db.evidenceUploadQueue).watch().map((r) => r.length);
}
