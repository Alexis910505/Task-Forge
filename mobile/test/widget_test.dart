import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:task_forge_app/app/task_forge_app.dart';

void main() {
  testWidgets('TaskForge arranca', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: TaskForgeApp()));
    await tester.pumpAndSettle();
    expect(find.textContaining('TaskForge'), findsWidgets);
  });
}
