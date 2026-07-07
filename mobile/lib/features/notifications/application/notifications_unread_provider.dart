import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_provider.dart';
import '../../../core/realtime/realtime_providers.dart';

final notificationsUnreadProvider =
    StateNotifierProvider<NotificationsUnreadController, int>((ref) {
  return NotificationsUnreadController(ref);
});

class NotificationsUnreadController extends StateNotifier<int> {
  NotificationsUnreadController(this._ref) : super(0) {
    _sub = _ref.read(realtimeServiceProvider).eventStream.listen((event) {
      if (event['event'] == 'notification') {
        Future.microtask(refresh);
      }
    });
    Future.microtask(refresh);
  }

  final Ref _ref;
  StreamSubscription<Map<String, Object?>>? _sub;

  Future<void> refresh() async {
    try {
      final dio = _ref.read(dioProvider);
      final res = await dio.get<Map<String, dynamic>>('/notifications/unread-count');
      final count = res.data?['count'];
      state = count is num ? count.toInt() : 0;
    } catch (_) {
      /* red o sin permiso */
    }
  }

  void setCount(int count) => state = count;

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}
