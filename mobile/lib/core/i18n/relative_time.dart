import 'package:intl/intl.dart';

/// Tiempo relativo corto (p. ej. «hace 12 min»).
String formatRelativeTime(DateTime date, String languageCode) {
  final isEs = languageCode.startsWith('es');
  final diffSec = date.difference(DateTime.now()).inSeconds;
  final abs = diffSec.abs();

  String ago(int n, String unitEs, String unitEn) {
    final unit = isEs ? unitEs : unitEn;
    if (isEs) {
      return diffSec < 0 ? 'hace $n $unit' : 'en $n $unit';
    }
    return diffSec < 0 ? '$n $unit ago' : 'in $n $unit';
  }

  if (abs < 60) {
    return ago(abs, 'seg', 'sec');
  }
  if (abs < 3600) {
    return ago((abs / 60).round(), 'min', 'min');
  }
  if (abs < 86400) {
    return ago((abs / 3600).round(), 'h', 'hr');
  }
  if (abs < 604800) {
    return ago((abs / 86400).round(), 'd', 'd');
  }
  final locale = isEs ? 'es' : 'en';
  return DateFormat.yMMMd(locale).format(date);
}

String dashboardGreeting(String languageCode, String? firstName) {
  final hour = DateTime.now().hour;
  final isEs = languageCode.startsWith('es');
  String part;
  if (hour < 12) {
    part = isEs ? 'Buenos días' : 'Good morning';
  } else if (hour < 19) {
    part = isEs ? 'Buenas tardes' : 'Good afternoon';
  } else {
    part = isEs ? 'Buenas noches' : 'Good evening';
  }
  if (firstName != null && firstName.isNotEmpty) {
    return '$part, $firstName';
  }
  return part;
}
