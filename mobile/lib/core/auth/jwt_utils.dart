import 'dart:convert';

/// Utilidades JWT (solo lectura del payload; no valida firma).
class JwtUtils {
  JwtUtils._();

  static Map<String, dynamic>? decodePayload(String token) {
    final parts = token.split('.');
    if (parts.length != 3) {
      return null;
    }
    try {
      final normalized = base64Url.normalize(parts[1]);
      final json = utf8.decode(base64Url.decode(normalized));
      final decoded = jsonDecode(json);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      if (decoded is Map) {
        return decoded.map((k, v) => MapEntry('$k', v));
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// User id (`sub`) del access token, si existe.
  static String? userId(String accessToken) {
    final payload = decodePayload(accessToken);
    final sub = payload?['sub'];
    if (sub == null) return null;
    final id = '$sub'.trim();
    return id.isEmpty ? null : id;
  }

  /// Expiración UTC del access token, o null si no se puede leer.
  static DateTime? accessExpiry(String accessToken) {
    final payload = decodePayload(accessToken);
    final exp = payload?['exp'];
    if (exp is int) {
      return DateTime.fromMillisecondsSinceEpoch(exp * 1000, isUtc: true);
    }
    if (exp is num) {
      return DateTime.fromMillisecondsSinceEpoch(exp.toInt() * 1000, isUtc: true);
    }
    return null;
  }

  /// True si el token ya expiró o vence en menos de [leeway].
  static bool isExpiredOrExpiringSoon(
    String accessToken, {
    Duration leeway = const Duration(seconds: 90),
  }) {
    final exp = accessExpiry(accessToken);
    if (exp == null) {
      // Sin exp legible: no forzar refresh proactivo (el 401 lo cubrirá).
      return false;
    }
    return DateTime.now().toUtc().isAfter(exp.subtract(leeway));
  }
}
