import 'dart:convert';

/// Aplica cambio de estado de una tarea sobre una copia del JSON del tablero (optimistic UI).
Map<String, dynamic> applyOfflineTaskStatusMove({
  required Map<String, dynamic> board,
  required String taskId,
  required String newStatus,
}) {
  final copy = Map<String, dynamic>.from(jsonDecode(jsonEncode(board)) as Map);
  final columns = (copy['columns'] as List?) ?? [];
  Map<String, dynamic>? moved;

  for (final col in columns) {
    final m = col as Map<String, dynamic>;
    final tasks = (m['tasks'] as List?) ?? [];
    final next = <dynamic>[];
    for (final t in tasks) {
      final tm = Map<String, dynamic>.from(t as Map);
      if ('${tm['id']}' == taskId) {
        moved = tm;
      } else {
        next.add(tm);
      }
    }
    m['tasks'] = next;
  }

  if (moved != null) {
    moved['status'] = newStatus;
    for (final col in columns) {
      final m = col as Map<String, dynamic>;
      if ('${m['status']}' == newStatus) {
        final tasks = List<dynamic>.from((m['tasks'] as List?) ?? []);
        tasks.add(moved);
        m['tasks'] = tasks;
        break;
      }
    }
  }

  final flat = copy['tasks'];
  if (flat is List) {
    copy['tasks'] = flat.map((e) {
      final tm = Map<String, dynamic>.from(e as Map);
      if ('${tm['id']}' == taskId) {
        tm['status'] = newStatus;
      }
      return tm;
    }).toList();
  }

  return copy;
}
