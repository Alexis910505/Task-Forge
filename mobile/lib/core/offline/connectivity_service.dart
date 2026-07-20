import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:get/get.dart';

bool connectivityLooksOnline(List<ConnectivityResult> results) {
  if (results.isEmpty) {
    return false;
  }
  return results.any((r) => r != ConnectivityResult.none);
}

class ConnectivityService extends GetxService {
  final online = true.obs;
  final results = <ConnectivityResult>[].obs;
  StreamSubscription<List<ConnectivityResult>>? _sub;

  @override
  void onInit() {
    super.onInit();
    unawaited(_bootstrap());
    _sub = Connectivity().onConnectivityChanged.listen((list) {
      results.assignAll(list);
      online.value = connectivityLooksOnline(list);
    });
  }

  Future<void> _bootstrap() async {
    final list = await Connectivity().checkConnectivity();
    results.assignAll(list);
    online.value = connectivityLooksOnline(list);
  }

  @override
  void onClose() {
    _sub?.cancel();
    super.onClose();
  }
}
