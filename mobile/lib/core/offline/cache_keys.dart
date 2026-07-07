/// Claves de caché local (prefijo estable para SQLite).
abstract final class CacheKeys {
  static String board(String boardId) => 'board:$boardId';
  static const dashboardSummary = 'dashboard:summary';
  static const defaultBoardId = 'prefs:default_board_id';
}
