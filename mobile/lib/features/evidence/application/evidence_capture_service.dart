import 'dart:io';

import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:uuid/uuid.dart';

/// Captura con cámara, compresión JPEG y geolocalización opcional.
class EvidenceCaptureService {
  EvidenceCaptureService._();

  static const _uuid = Uuid();

  static Future<String?> captureCompressedJpeg() async {
    final cam = await Permission.camera.request();
    if (!cam.isGranted) {
      return null;
    }
    final picker = ImagePicker();
    final x = await picker.pickImage(
      source: ImageSource.camera,
      preferredCameraDevice: CameraDevice.rear,
    );
    if (x == null) {
      return null;
    }
    final base = await getApplicationSupportDirectory();
    final pending = Directory(p.join(base.path, 'evidence_pending'));
    if (!pending.existsSync()) {
      pending.createSync(recursive: true);
    }
    final target = p.join(pending.path, '${_uuid.v4()}.jpg');
    final out = await FlutterImageCompress.compressAndGetFile(
      x.path,
      target,
      quality: 82,
      minWidth: 1600,
      keepExif: true,
    );
    return out?.path;
  }

  /// Devuelve (lat, lng) o (null, null) si el usuario desactiva GPS o deniega permisos.
  static Future<(double?, double?)> optionalLocation(bool wantGps) async {
    if (!wantGps) {
      return (null, null);
    }
    final service = await Geolocator.isLocationServiceEnabled();
    if (!service) {
      return (null, null);
    }
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
      return (null, null);
    }
    final pos = await Geolocator.getCurrentPosition();
    return (pos.latitude, pos.longitude);
  }
}
