import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:frontend/evaluation_wizard.dart';

void main() {
  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('Evaluation Wizard Step 1 TextField has explicit dark text color (0xFF1D1D1F)', (WidgetTester tester) async {
    // Render the EvaluationWizard within light theme
    await tester.pumpWidget(
      MaterialApp(
        themeMode: ThemeMode.light,
        theme: ThemeData(
          brightness: Brightness.light,
          useMaterial3: true,
          scaffoldBackgroundColor: Colors.white,
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF0071E3),
            brightness: Brightness.light,
          ),
        ),
        home: const EvaluationWizard(),
      ),
    );

    await tester.pumpAndSettle();

    // Locate the primary input TextField on Step 1
    final textFieldFinder = find.byType(TextField);
    expect(textFieldFinder, findsAtLeastNWidgets(1));

    final TextField textField = tester.widget<TextField>(textFieldFinder.first);

    // Verify text style has explicit dark color
    expect(textField.style, isNotNull);
    expect(textField.style!.color, equals(const Color(0xFF1D1D1F)));
  });

  testWidgets('Evaluation Wizard Step 1 TextField remains dark under Dark Mode MediaQuery', (WidgetTester tester) async {
    // Simulating system Dark Mode on phone device
    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(platformBrightness: Brightness.dark),
        child: MaterialApp(
          themeMode: ThemeMode.light,
          theme: ThemeData(
            brightness: Brightness.light,
            useMaterial3: true,
            scaffoldBackgroundColor: Colors.white,
          ),
          home: const EvaluationWizard(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    final textFieldFinder = find.byType(TextField);
    expect(textFieldFinder, findsAtLeastNWidgets(1));

    final TextField textField = tester.widget<TextField>(textFieldFinder.first);
    expect(textField.style!.color, equals(const Color(0xFF1D1D1F)));

    // Type text into the field
    await tester.enterText(textFieldFinder.first, 'My innovative pitch idea text');
    await tester.pumpAndSettle();

    expect(find.text('My innovative pitch idea text'), findsOneWidget);
  });
}
