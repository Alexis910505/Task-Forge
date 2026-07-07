import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Logo oficial (mismo SVG que `web/public/logo.svg`).
const String kAppLogoSvgAsset = 'assets/images/logo.svg';

/// PNG para iconos del sistema y fallback.
const String kAppLogoPngAsset = 'assets/images/logo.png';

/// Logo TaskForge reutilizable en login, drawer y cabecera.
class AppLogo extends StatelessWidget {
  const AppLogo({super.key, this.size = 40});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      kAppLogoSvgAsset,
      width: size,
      height: size,
      fit: BoxFit.contain,
      semanticsLabel: 'TaskForge',
      placeholderBuilder: (_) => Image.asset(
        kAppLogoPngAsset,
        width: size,
        height: size,
        fit: BoxFit.contain,
      ),
    );
  }
}
