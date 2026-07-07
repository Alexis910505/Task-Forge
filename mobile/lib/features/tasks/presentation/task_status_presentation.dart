import 'package:flutter/material.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

const kTaskStatuses = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'COMPLETED',
];

class TaskStatusVisual {
  const TaskStatusVisual({
    required this.label,
    required this.color,
    required this.dotColor,
  });

  final String label;
  final Color color;
  final Color dotColor;
}

TaskStatusVisual taskStatusVisual(String status, ColorScheme scheme, AppLocalizations l10n) {
  switch (status) {
    case 'BACKLOG':
      return TaskStatusVisual(
        label: l10n.taskDetailStatusBacklog,
        color: scheme.onSurfaceVariant,
        dotColor: scheme.outline,
      );
    case 'TODO':
      return TaskStatusVisual(
        label: l10n.taskDetailStatusTodo,
        color: scheme.primary,
        dotColor: scheme.primary,
      );
    case 'IN_PROGRESS':
      return TaskStatusVisual(
        label: l10n.taskDetailStatusInProgress,
        color: scheme.tertiary,
        dotColor: scheme.tertiary,
      );
    case 'REVIEW':
      return TaskStatusVisual(
        label: l10n.taskDetailStatusReview,
        color: scheme.secondary,
        dotColor: scheme.secondary,
      );
    case 'COMPLETED':
      return TaskStatusVisual(
        label: l10n.taskDetailStatusCompleted,
        color: scheme.tertiary,
        dotColor: scheme.tertiary,
      );
    default:
      return TaskStatusVisual(
        label: status,
        color: scheme.onSurfaceVariant,
        dotColor: scheme.outline,
      );
  }
}
