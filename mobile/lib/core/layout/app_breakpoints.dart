import 'package:flutter/widgets.dart';

/// Puntos de quiebre para layout responsive (Material / adaptativos).
abstract final class AppBreakpoints {
  static const double compact = 600;
  static const double medium = 900;
  static const double expanded = 1200;
}

extension AppBreakpointContext on BuildContext {
  bool get isCompactWidth =>
      MediaQuery.sizeOf(this).width < AppBreakpoints.compact;

  bool get isMediumWidth {
    final w = MediaQuery.sizeOf(this).width;
    return w >= AppBreakpoints.compact && w < AppBreakpoints.medium;
  }

  bool get isExpandedWidth =>
      MediaQuery.sizeOf(this).width >= AppBreakpoints.medium;
}
