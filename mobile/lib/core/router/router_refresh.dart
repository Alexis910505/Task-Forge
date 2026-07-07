import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/application/auth_repository.dart';

class GoRouterRefresh extends ChangeNotifier {
  GoRouterRefresh(this._ref) {
    _ref.listen<AsyncValue<AuthSession?>>(
      authRepositoryProvider,
      (_, __) => notifyListeners(),
    );
  }

  final Ref _ref;
}

final goRouterRefreshProvider = Provider<GoRouterRefresh>((ref) {
  final notifier = GoRouterRefresh(ref);
  ref.onDispose(notifier.dispose);
  return notifier;
});
