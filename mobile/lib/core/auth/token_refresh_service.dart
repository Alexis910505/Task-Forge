import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

import '../../features/auth/application/auth_repository.dart';
import 'jwt_utils.dart';

/// Orquesta el refresh del access token (GetX).
class TokenRefreshService extends GetxService {
  Timer? _timer;
  Future<bool?>? _inFlight;
  Worker? _sessionWorker;

  AuthController get _auth => Get.find<AuthController>();

  void start() {
    _sessionWorker?.dispose();
    _sessionWorker = ever<AuthSession?>(_auth.session, _scheduleForSession);
    _scheduleForSession(_auth.currentSession);
  }

  @override
  void onClose() {
    _timer?.cancel();
    _sessionWorker?.dispose();
    super.onClose();
  }

  Future<bool?> ensureFreshAccessToken({
    Duration leeway = const Duration(seconds: 90),
  }) async {
    final session = _auth.currentSession;
    if (session == null) {
      return false;
    }
    if (!JwtUtils.isExpiredOrExpiringSoon(session.accessToken, leeway: leeway)) {
      return true;
    }
    return refreshNow();
  }

  Future<bool?> refreshNow() async {
    if (_inFlight != null) {
      return _inFlight;
    }
    _inFlight = _runRefresh();
    try {
      return await _inFlight;
    } finally {
      _inFlight = null;
    }
  }

  Future<bool?> _runRefresh() async {
    final result = await _auth.tryRefreshSession();
    if (result == true) {
      _scheduleForSession(_auth.currentSession);
    } else if (result == false) {
      _timer?.cancel();
      _timer = null;
    }
    return result;
  }

  Future<void> onAppResumed() async {
    final result = await ensureFreshAccessToken();
    if (result == false) {
      return;
    }
    _scheduleForSession(_auth.currentSession);
  }

  void _scheduleForSession(AuthSession? session) {
    _timer?.cancel();
    _timer = null;
    if (session == null) {
      return;
    }
    final exp = JwtUtils.accessExpiry(session.accessToken);
    if (exp == null) {
      _timer = Timer(const Duration(minutes: 12), () {
        unawaited(refreshNow());
      });
      return;
    }
    final refreshAt = exp.subtract(const Duration(seconds: 90));
    final delay = refreshAt.difference(DateTime.now().toUtc());
    if (delay <= Duration.zero) {
      unawaited(refreshNow());
      return;
    }
    if (kDebugMode) {
      debugPrint(
        '[auth] próximo refresh de token en ${delay.inSeconds}s '
        '(expira ${exp.toLocal()})',
      );
    }
    _timer = Timer(delay, () {
      unawaited(refreshNow());
    });
  }
}
