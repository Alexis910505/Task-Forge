import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

/// Etiqueta de un intervalo de repetición (`null` = no se repite).
String recurrenceLabel(String? recurrence, AppLocalizations l10n) {
  switch (recurrence) {
    case 'DAILY':
      return l10n.recurrenceDaily;
    case 'WEEKLY':
      return l10n.recurrenceWeekly;
    case 'MONTHLY':
      return l10n.recurrenceMonthly;
    case 'YEARLY':
      return l10n.recurrenceYearly;
    default:
      return l10n.recurrenceNone;
  }
}

/// Tarjeta del detalle: intervalo, cuándo aparece la siguiente y cuántas veces se hizo.
class TaskRecurrenceCard extends StatelessWidget {
  const TaskRecurrenceCard({super.key, required this.task});

  final Map<String, dynamic> task;

  @override
  Widget build(BuildContext context) {
    final recurrence = task['recurrence'] as String?;
    final series = task['recurrenceSeries'];
    if (recurrence == null && series is! Map) return const SizedBox.shrink();

    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final locale = Localizations.localeOf(context).toLanguageTag();

    final nextAt = DateTime.tryParse('${task['nextOccurrenceAt'] ?? ''}');
    final String nextLine;
    if (task['spawnedNextId'] != null) {
      nextLine = l10n.taskDetailRecurrenceNextCreated;
    } else if (recurrence == null) {
      nextLine = l10n.taskDetailRecurrenceStopped;
    } else if (nextAt != null) {
      nextLine = l10n.taskDetailRecurrenceNextAt(
        DateFormat.yMMMd(locale).add_Hm().format(nextAt.toLocal()),
      );
    } else if (task['status'] == 'COMPLETED') {
      nextLine = l10n.taskDetailRecurrenceStopped;
    } else {
      nextLine = l10n.taskDetailRecurrenceNextAfterComplete;
    }

    final occurrence = task['occurrence'];
    final done = series is Map ? (series['completed'] as num?)?.toInt() : null;
    final total = series is Map ? (series['total'] as num?)?.toInt() : null;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.primary.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.primary.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.repeat, color: scheme.primary, size: 20),
              const SizedBox(width: 8),
              Text(
                l10n.taskDetailRecurrenceTitle.toUpperCase(),
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.6,
                  color: scheme.onSurfaceVariant,
                ),
              ),
              const Spacer(),
              if (occurrence is num && series is Map)
                Text(
                  l10n.taskDetailRecurrenceOccurrence(occurrence.toInt()),
                  style: theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            recurrenceLabel(recurrence, l10n),
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            nextLine,
            style: theme.textTheme.bodySmall?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
          if (done != null && total != null) ...[
            const SizedBox(height: 10),
            Text(
              l10n.taskDetailRecurrenceStats(done, total),
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: scheme.primary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
