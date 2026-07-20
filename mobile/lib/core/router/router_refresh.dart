import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../../features/auth/application/auth_repository.dart';

class GoRouterRefresh extends ChangeNotifier {
  GoRouterRefresh() {
    _worker = ever<AuthSession?>(Get.find<AuthController>().session, (_) {
      notifyListeners();
    });
    _bootWorker = ever<bool>(Get.find<AuthController>().isBootstrapping, (_) {
      notifyListeners();
    });
  }

  Worker? _worker;
  Worker? _bootWorker;

  @override
  void dispose() {
    _worker?.dispose();
    _bootWorker?.dispose();
    super.dispose();
  }
}
