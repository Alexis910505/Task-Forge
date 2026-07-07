import '../config/env.dart';

/// Resuelve URLs de archivos subidos (`/uploads/...`).
String resolveUploadUrl(String url) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  final base = Env.apiBaseUrl.replaceAll(RegExp(r'/$'), '');
  final path = url.startsWith('/') ? url : '/$url';
  return '$base$path';
}
