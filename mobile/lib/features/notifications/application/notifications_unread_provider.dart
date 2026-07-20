import 'dart:async';

import 'package:get/get.dart' hide FormData, MultipartFile, Response;

import '../../../core/network/dio_provider.dart';
import '../../../core/realtime/realtime_service.dart';

class NotificationsUnreadController extends GetxController {
  final count = 0.obs;
  /// Incrementa al llegar una notificación en vivo (la lista puede escuchar).
  final revision = 0.obs;
  StreamSubscription<Map<String, Object?>>? _sub;
  Timer? _poll;

  @override
  void onInit() {
    super.onInit();
    _sub = Get.find<RealtimeService>().eventStream.listen((event) {
      if (event['event'] == 'notification') {
        revision.value++;
        final payload = event['payload'];
        if (payload is Map && payload['read'] != true) {
          count.value = count.value + 1;
        }
        Future.microtask(refreshCount);
      }
    });
    Future.microtask(refreshCount);
    // Respaldo si el socket cae (similar al polling de la web).
    _poll = Timer.periodic(const Duration(seconds: 60), (_) {
      Future.microtask(refreshCount);
    });
  }

  Future<void> refreshCount() async {
    try {
      final dio = Get.find<ApiClient>().dio;
      final res = await dio.get<Map<String, dynamic>>(
        '/notifications/unread-count',
      );
      final c = res.data?['count'];
      count.value = c is num ? c.toInt() : 0;
    } catch (_) {
      /* red o sin permiso */
    }
  }

  void setCount(int value) => count.value = value;

  @override
  void onClose() {
    _sub?.cancel();
    _poll?.cancel();
    super.onClose();
  }
}
