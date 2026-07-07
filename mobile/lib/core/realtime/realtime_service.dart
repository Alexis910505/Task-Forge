import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as sio;

import '../config/env.dart';

/// Cliente Socket.IO (namespace `/events`): salas `org:{id}` automáticas y `board:{id}` bajo demanda.
class RealtimeService {
  sio.Socket? _socket;
  final Set<String> _joinedBoards = {};
  final StreamController<Map<String, Object?>> _events = StreamController.broadcast();

  Stream<Map<String, Object?>> get eventStream => _events.stream;

  static String _socketUrl() {
    var base = Env.apiBaseUrl.trim();
    if (base.endsWith('/')) {
      base = base.substring(0, base.length - 1);
    }
    return '$base/events';
  }

  void connect(String accessToken) {
    disconnect();
    final uri = _socketUrl();
    _socket = sio.io(
      uri,
      sio.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': accessToken})
          .enableReconnection()
          .enableForceNew()
          .build(),
    );

    _socket!
      ..onConnect(_onConnected)
      ..onDisconnect((_) => debugPrint('[realtime] desconectado'))
      ..onConnectError((e) => debugPrint('[realtime] error conexión: $e'))
      ..on('task.created', (d) => _emit('task.created', d))
      ..on('task.status_changed', (d) => _emit('task.status_changed', d))
      ..on('task.assigned', (d) => _emit('task.assigned', d))
      ..on('comment.created', (d) => _emit('comment.created', d))
      ..on('notification', (d) => _emit('notification', d))
      ..on('kanban.card_moved', (d) => _emit('kanban.card_moved', d))
      ..on('task.updated', (d) => _emit('task.updated', d))
      ..on('dashboard.refresh', (d) => _emit('dashboard.refresh', d));
  }

  void _onConnected(_) {
    debugPrint('[realtime] conectado');
    _socket?.emit('user:join');
    for (final boardId in _joinedBoards) {
      _socket?.emit('board:join', {'boardId': boardId});
    }
  }

  void _emit(String name, dynamic data) {
    if (data is Map) {
      final m = Map<String, Object?>.from(
        data.map((k, v) => MapEntry(k.toString(), v as Object?)),
      );
      _events.add({'event': name, 'payload': m});
    } else {
      _events.add({'event': name, 'payload': null});
    }
  }

  void joinBoard(String boardId) {
    if (boardId.isEmpty) {
      return;
    }
    _joinedBoards.add(boardId);
    _socket?.emit('board:join', {'boardId': boardId});
  }

  void leaveBoard(String boardId) {
    _joinedBoards.remove(boardId);
    _socket?.emit('board:leave', {'boardId': boardId});
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  void dispose() {
    disconnect();
    _joinedBoards.clear();
    if (!_events.isClosed) {
      _events.close();
    }
  }
}
