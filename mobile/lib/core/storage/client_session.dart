import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get/get.dart';
import 'package:uuid/uuid.dart';

const _kClientId = 'tf_client_id';

class ClientSessionHelper extends GetxService {
  String? _cachedId;

  FlutterSecureStorage get _storage => Get.find<FlutterSecureStorage>();

  Future<String> clientId() async {
    if (_cachedId != null) {
      return _cachedId!;
    }
    var id = await _storage.read(key: _kClientId);
    if (id == null || id.length < 8) {
      id = const Uuid().v4();
      await _storage.write(key: _kClientId, value: id);
    }
    _cachedId = id;
    return id;
  }

  Future<Map<String, String>> apiPayload() async {
    return {'clientId': await clientId(), 'platform': 'mobile'};
  }
}
