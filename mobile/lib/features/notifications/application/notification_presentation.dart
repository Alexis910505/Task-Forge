import 'package:flutter/material.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../tasks/presentation/task_status_presentation.dart';

class NotificationItem {
  const NotificationItem({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.read,
    required this.createdAt,
    this.metadata,
  });

  final String id;
  final String type;
  final String title;
  final String? body;
  final bool read;
  final DateTime createdAt;
  final Map<String, dynamic>? metadata;

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: '${json['id']}',
      type: '${json['type'] ?? 'SYSTEM'}',
      title: '${json['title'] ?? ''}',
      body: json['body'] as String?,
      read: json['read'] == true,
      createdAt: DateTime.tryParse('${json['createdAt']}') ?? DateTime.now(),
      metadata: json['metadata'] is Map
          ? Map<String, dynamic>.from(json['metadata'] as Map)
          : null,
    );
  }
}

class NotificationMetadata {
  const NotificationMetadata({
    this.taskId,
    this.taskTitle,
    this.threadTitle,
    this.status,
  });

  final String? taskId;
  final String? taskTitle;
  final String? threadTitle;
  final String? status;

  static NotificationMetadata parse(Map<String, dynamic>? raw) {
    if (raw == null) return const NotificationMetadata();
    return NotificationMetadata(
      taskId: raw['taskId'] as String?,
      taskTitle: raw['taskTitle'] as String?,
      threadTitle: raw['threadTitle'] as String?,
      status: raw['status'] as String?,
    );
  }
}

class NotificationVisual {
  const NotificationVisual({
    required this.icon,
    required this.backgroundColor,
    required this.iconColor,
    this.borderColor,
  });

  final IconData icon;
  final Color backgroundColor;
  final Color iconColor;
  final Color? borderColor;
}

NotificationVisual notificationVisual(String type, ColorScheme scheme) {
  switch (type) {
    case 'TASK_ASSIGNED':
      return NotificationVisual(
        icon: Icons.assignment_ind,
        backgroundColor: scheme.primary,
        iconColor: scheme.onPrimary,
      );
    case 'TASK_UPDATED':
      return NotificationVisual(
        icon: Icons.check_circle_outlined,
        backgroundColor: scheme.tertiary.withValues(alpha: 0.12),
        iconColor: scheme.tertiary,
      );
    case 'COMMENT':
      return NotificationVisual(
        icon: Icons.chat_bubble_outline,
        backgroundColor: scheme.secondaryContainer,
        iconColor: scheme.onSecondaryContainer,
      );
    case 'MENTION':
      return NotificationVisual(
        icon: Icons.alternate_email,
        backgroundColor: scheme.secondaryContainer,
        iconColor: scheme.onSecondaryContainer,
      );
    case 'SYSTEM':
    default:
      return NotificationVisual(
        icon: Icons.warning_amber_rounded,
        backgroundColor: scheme.errorContainer.withValues(alpha: 0.35),
        iconColor: scheme.error,
      );
  }
}

String notificationTypeLabel(String type, AppLocalizations l10n) {
  switch (type) {
    case 'TASK_ASSIGNED':
      return l10n.notificationsTypeTaskAssigned;
    case 'TASK_UPDATED':
      return l10n.notificationsTypeTaskUpdated;
    case 'COMMENT':
      return l10n.notificationsTypeComment;
    case 'MENTION':
      return l10n.notificationsTypeMention;
    case 'SYSTEM':
    default:
      return l10n.notificationsTypeSystem;
  }
}

enum NotificationSectionKey { newAlerts, yesterday, earlier }

class NotificationSection {
  const NotificationSection({required this.key, required this.items});

  final NotificationSectionKey key;
  final List<NotificationItem> items;
}

DateTime _startOfDay(DateTime d) => DateTime(d.year, d.month, d.day);

List<NotificationSection> groupNotifications(List<NotificationItem> items) {
  final now = DateTime.now();
  final todayStart = _startOfDay(now);
  final yesterdayStart = todayStart.subtract(const Duration(days: 1));

  final newAlerts = <NotificationItem>[];
  final yesterday = <NotificationItem>[];
  final earlier = <NotificationItem>[];

  for (final n in items) {
    if (!n.read) {
      newAlerts.add(n);
      continue;
    }
    final at = n.createdAt.toLocal();
    if (at.isAfter(yesterdayStart) && at.isBefore(todayStart)) {
      yesterday.add(n);
    } else if (at.isBefore(yesterdayStart)) {
      earlier.add(n);
    } else {
      yesterday.add(n);
    }
  }

  final sections = <NotificationSection>[];
  if (newAlerts.isNotEmpty) {
    sections.add(NotificationSection(key: NotificationSectionKey.newAlerts, items: newAlerts));
  }
  if (yesterday.isNotEmpty) {
    sections.add(NotificationSection(key: NotificationSectionKey.yesterday, items: yesterday));
  }
  if (earlier.isNotEmpty) {
    sections.add(NotificationSection(key: NotificationSectionKey.earlier, items: earlier));
  }
  return sections;
}

String formatYesterdaySectionLabel(String languageCode) {
  final y = DateTime.now().subtract(const Duration(days: 1));
  final isEs = languageCode.startsWith('es');
  if (isEs) {
    const months = [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
    ];
    return '${y.day} ${months[y.month - 1]}';
  }
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return '${months[y.month - 1]} ${y.day}';
}

String? statusLabelForNotification(String? status, AppLocalizations l10n, ColorScheme scheme) {
  if (status == null || status.isEmpty) return null;
  return taskStatusVisual(status, scheme, l10n).label;
}
