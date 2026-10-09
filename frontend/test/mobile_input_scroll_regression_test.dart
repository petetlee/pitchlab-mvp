import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:frontend/evaluation_wizard.dart';

void main() {
  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('PL-20261009-03-MOBILE-SAFARI-INPUT Regression Suite', () {
    testWidgets('1. Step 1 TextField has scrollPadding, cursorColor, and high-contrast styling', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            useMaterial3: true,
            brightness: Brightness.light,
          ),
          home: const EvaluationWizard(),
        ),
      );
      await tester.pumpAndSettle();

      final textFieldFinder = find.byType(TextField);
      expect(textFieldFinder, findsAtLeastNWidgets(1));

      final TextField textField = tester.widget<TextField>(textFieldFinder.first);
      
      // Verify scrollPadding bottom is at least 120 to keep text/caret visible above mobile keyboard
      expect(textField.scrollPadding.bottom, greaterThanOrEqualTo(120.0));
      
      // Verify cursor is PitchLab blue (0xFF0071E3)
      expect(textField.cursorColor, equals(const Color(0xFF0071E3)));

      // Verify text style has explicit dark color (0xFF1D1D1F)
      expect(textField.style?.color, equals(const Color(0xFF1D1D1F)));

      // Verify multiline support
      expect(textField.maxLines, isNull);
      expect(textField.minLines, isNotNull);
      expect(textField.minLines, greaterThanOrEqualTo(3));
    });

    testWidgets('2. Simulated iPhone Safari viewport with open keyboard allows typing without overflow', (WidgetTester tester) async {
      // iPhone 14/15 viewport: 390x844 logical pixels, with 320px keyboard inset
      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(
              size: Size(390, 844),
              padding: EdgeInsets.only(top: 47, bottom: 34), // iPhone Dynamic Island + Home bar
              viewInsets: EdgeInsets.only(bottom: 320), // 320px iOS Safari virtual keyboard
            ),
            child: const EvaluationWizard(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Verify Scaffold has resizeToAvoidBottomInset enabled
      final scaffoldFinder = find.byType(Scaffold);
      expect(scaffoldFinder, findsOneWidget);
      final Scaffold scaffold = tester.widget<Scaffold>(scaffoldFinder);
      expect(scaffold.resizeToAvoidBottomInset, isTrue);

      // Verify TextField is visible and accepts long answer
      final textFieldFinder = find.byType(TextField).first;
      const longAnswer = 'PitchLab is an intelligent business evaluation platform that tests concept viability, calculates risk metrics, and synthesizes 90-day execution roadmaps for founders.\n\nLine 2: Target market is early-stage founders.\nLine 3: Tested with actual market data.';
      await tester.enterText(textFieldFinder, longAnswer);
      await tester.pumpAndSettle();

      expect(find.text(longAnswer), findsOneWidget);
      expect(tester.takeException(), isNull); // Verify NO RenderFlex overflows
    });

    testWidgets('3. Form preserves answers when navigating forward and back between steps', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: EvaluationWizard(),
        ),
      );
      await tester.pumpAndSettle();

      // Enter answer on Step 1
      const myIdea = 'A revolutionary clean energy solar mooring system';
      final step1Field = find.byType(TextField).first;
      await tester.enterText(step1Field, myIdea);
      await tester.pumpAndSettle();

      // Advance to Step 2
      final continueButton = find.widgetWithText(ElevatedButton, 'Continue');
      expect(continueButton, findsOneWidget);
      await tester.tap(continueButton);
      await tester.pumpAndSettle();

      // Step 2 should be displayed
      expect(find.text('The Problem'), findsOneWidget);

      // Navigate back to Step 1
      final backButton = find.widgetWithText(OutlinedButton, 'Back');
      expect(backButton, findsOneWidget);
      await tester.tap(backButton);
      await tester.pumpAndSettle();

      // Verify Step 1 retained the user input
      expect(find.text('Your Idea'), findsOneWidget);
      expect(find.text(myIdea), findsOneWidget);
    });

    testWidgets('4. Step 5 (Location) text fields have scrollPadding and cursorColor', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: EvaluationWizard(initialStep: 4),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Primary Location (Optional)'), findsOneWidget);
      final locationFields = find.byType(TextField);
      expect(locationFields, findsNWidgets(3));

      for (int i = 0; i < 3; i++) {
        final TextField field = tester.widget<TextField>(locationFields.at(i));
        expect(field.scrollPadding.bottom, greaterThanOrEqualTo(120.0));
        expect(field.cursorColor, equals(const Color(0xFF0071E3)));
      }
    });

    testWidgets('5. Step 6 (Founder Background) narrative text field has scrollPadding, cursorColor and minLines', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: EvaluationWizard(initialStep: 5),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Your Background and Experience'), findsOneWidget);
      final founderFieldFinder = find.byType(TextField);
      expect(founderFieldFinder, findsAtLeastNWidgets(1));

      final TextField founderField = tester.widget<TextField>(founderFieldFinder.first);
      expect(founderField.scrollPadding.bottom, greaterThanOrEqualTo(120.0));
      expect(founderField.cursorColor, equals(const Color(0xFF0071E3)));
      expect(founderField.minLines, greaterThanOrEqualTo(5));
      expect(founderField.maxLines, isNull);
    });
  });
}
