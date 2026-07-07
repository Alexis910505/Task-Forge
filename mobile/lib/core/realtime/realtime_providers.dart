import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'realtime_service.dart';

final realtimeServiceProvider = Provider<RealtimeService>((ref) {
  final svc = RealtimeService();
  ref.onDispose(svc.dispose);
  return svc;
});
