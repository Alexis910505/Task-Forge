import 'dart:io';

import 'package:flutter/foundation.dart';

/// Base URL del API NestJS.
/// Android emulador: `http://10.0.2.2:3000` — Web/iOS/desktop: `http://localhost:3000`
class Env {
  static const String _fromDefine = String.fromEnvironment('API_BASE');

  static String get apiBaseUrl {
    if (_fromDefine.isNotEmpty) {
      return _fromDefine;
    }
    if (kIsWeb) {
      return 'http://localhost:3000';
    }
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  /// Slug de organización en login (sin campo en pantalla).
  /// `flutter run --dart-define=ORG_SLUG=mi-empresa`
  static const String organizationSlug = String.fromEnvironment('ORG_SLUG', defaultValue: 'default');
}
