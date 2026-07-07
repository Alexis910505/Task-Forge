import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import 'secure_storage_provider.dart';

const _kClientId = 'tf_client_id';

final clientSessionProvider = Provider<ClientSessionHelper>((ref) {
  return ClientSessionHelper(ref);
});

class ClientSessionHelper {
  ClientSessionHelper(this._ref);

  final Ref _ref;
  String? _cachedId;

  Future<String> clientId() async {
    if (_cachedId != null) {
      return _cachedId!;
    }
    final storage = _ref.read(secureStorageProvider);
    var id = await storage.read(key: _kClientId);
    if (id == null || id.length < 8) {
      id = const Uuid().v4();
      await storage.write(key: _kClientId, value: id);
    }
    _cachedId = id;
    return id;
  }

  Future<Map<String, String>> apiPayload() async {
    return {'clientId': await clientId(), 'platform': 'mobile'};
  }
}
