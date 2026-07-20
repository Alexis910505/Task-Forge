import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get/get.dart';

import '../../features/auth/application/auth_repository.dart';
import '../../features/create_task/application/offline_create_task_service.dart';
import '../../features/evidence/application/evidence_upload_worker.dart';
import '../../features/my_tasks/application/my_tasks_controller.dart';
import '../../features/notifications/application/notifications_unread_provider.dart';
import '../auth/token_refresh_service.dart';
import '../i18n/locale_controller.dart';
import '../network/dio_provider.dart';
import '../offline/app_database.dart';
import '../offline/connectivity_service.dart';
import '../offline/local_data_service.dart';
import '../offline/outbox_sync_service.dart';
import '../realtime/realtime_service.dart';
import '../storage/client_session.dart';
import '../storage/secure_storage_provider.dart';

/// Registro global de servicios GetX.
class InitialBinding extends Bindings {
  @override
  void dependencies() {
    Get.put<FlutterSecureStorage>(kSecureStorage, permanent: true);
    Get.put(ClientSessionHelper(), permanent: true);
    Get.put(AppDatabase(), permanent: true);
    Get.put(LocalDataService(Get.find<AppDatabase>()), permanent: true);
    Get.put(ApiClient(), permanent: true);
    Get.put(AuthController(), permanent: true);
    Get.put(TokenRefreshService(), permanent: true);
    Get.put(OutboxSyncService(), permanent: true);
    Get.put(EvidenceUploadWorker(), permanent: true);
    Get.put(const OfflineCreateTaskService(), permanent: true);
    Get.put(RealtimeService(), permanent: true);
    Get.put(LocaleController(), permanent: true);
    Get.put(ConnectivityService(), permanent: true);
    Get.put(NotificationsUnreadController(), permanent: true);
    // Listado siempre vivo: escucha websocket y actualiza solo.
    Get.put(MyTasksController(), permanent: true);
  }
}
