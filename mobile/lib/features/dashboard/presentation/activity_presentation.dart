import 'package:flutter/material.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

class ActivityVisual {
  const ActivityVisual({
    required this.icon,
    required this.background,
    required this.foreground,
  });

  final IconData icon;
  final Color background;
  final Color foreground;
}

ActivityVisual activityVisual(String action, ColorScheme scheme) {
  if (action.contains('completed')) {
    return ActivityVisual(
      icon: Icons.check_circle_outlined,
      background: scheme.tertiaryContainer.withValues(alpha: 0.25),
      foreground: scheme.tertiary,
    );
  }
  if (action.contains('attachment') || action.contains('photo')) {
    return ActivityVisual(
      icon: Icons.photo_camera_outlined,
      background: scheme.secondaryContainer,
      foreground: scheme.onSecondaryContainer,
    );
  }
  if (action.contains('comment')) {
    return ActivityVisual(
      icon: Icons.chat_bubble_outline,
      background: scheme.secondaryContainer,
      foreground: scheme.onSecondaryContainer,
    );
  }
  if (action.contains('assigned') ||
      action.contains('priority') ||
      action.contains('warning') ||
      action.contains('alert')) {
    return ActivityVisual(
      icon: Icons.warning_amber_outlined,
      background: scheme.errorContainer,
      foreground: scheme.onErrorContainer,
    );
  }
  if (action.contains('created')) {
    return ActivityVisual(
      icon: Icons.new_label_outlined,
      background: scheme.primaryContainer.withValues(alpha: 0.2),
      foreground: scheme.primary,
    );
  }
  return ActivityVisual(
    icon: Icons.bolt_outlined,
    background: scheme.primaryContainer.withValues(alpha: 0.2),
    foreground: scheme.primary,
  );
}

String _userName(Map<String, dynamic>? user) {
  if (user == null) {
    return '';
  }
  final first = '${user['firstName'] ?? ''}'.trim();
  final last = '${user['lastName'] ?? ''}'.trim();
  final name = '$first $last'.trim();
  if (name.isNotEmpty) {
    return name;
  }
  return '${user['email'] ?? ''}'.trim();
}

String _taskTitle(Map<String, dynamic> entry) {
  final task = entry['task'];
  if (task is Map) {
    return '${task['title'] ?? ''}'.trim();
  }
  return '';
}

String activityMessage(AppLocalizations l10n, Map<String, dynamic> entry) {
  final action = '${entry['action'] ?? ''}';
  final task = _taskTitle(entry);
  final user = _userName(entry['user'] is Map ? Map<String, dynamic>.from(entry['user'] as Map) : null);
  final taskLabel = task.isEmpty ? '—' : task;
  final userLabel = user.isEmpty ? '—' : user;

  switch (action) {
    case 'task.created':
      return l10n.activity_task_created(taskLabel);
    case 'task.assigned':
      return l10n.activity_task_assigned(userLabel, taskLabel);
    case 'task.status_changed':
      return l10n.activity_task_status_changed(taskLabel);
    case 'task.completed':
      return l10n.activity_task_completed(taskLabel);
    case 'comment.added':
      return l10n.activity_comment_added(userLabel, taskLabel);
    case 'attachment.added':
      return l10n.activity_attachment_added(userLabel, taskLabel);
    default:
      if (action.contains('completed') && task.isNotEmpty) {
        return l10n.activity_task_completed(task);
      }
      if (user.isNotEmpty && task.isNotEmpty) {
        return '$user · $task';
      }
      if (task.isNotEmpty) {
        return task;
      }
      return action.isEmpty ? '—' : action;
  }
}

String? activityTaskId(Map<String, dynamic> entry) {
  final task = entry['task'];
  if (task is Map) {
    final id = task['id'];
    if (id != null) {
      return '$id';
    }
  }
  return null;
}
