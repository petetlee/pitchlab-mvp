import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/landing_page.dart';

void main() {
  testWidgets('LandingPage displays Contact section, nav link, and footer link', (WidgetTester tester) async {
    // Provide adequate size for desktop view
    tester.view.physicalSize = const Size(1280, 1024);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      const MaterialApp(
        home: LandingPage(),
      ),
    );
    await tester.pumpAndSettle();

    // Verify Navigation Contact Link
    expect(find.byKey(const ValueKey('nav_contact_button')), findsOneWidget);
    expect(find.text('Contact'), findsWidgets);

    // Verify Contact Section Title & Subtitle
    expect(find.text('Contact Peter Lee'), findsOneWidget);
    expect(find.text('Have a question about PitchLab or feedback to share? Get in touch.'), findsOneWidget);

    // Verify Email link and text
    expect(find.byKey(const ValueKey('contact_email_link')), findsOneWidget);
    expect(find.text('Email: Peter@PNC.co.nz'), findsOneWidget);

    // Verify Phone link and text
    expect(find.byKey(const ValueKey('contact_phone_link')), findsOneWidget);
    expect(find.text('Phone: 022 533 6867'), findsOneWidget);

    // Verify Footer Contact Link
    expect(find.byKey(const ValueKey('footer_contact_link')), findsOneWidget);

    // Test tapping nav contact button scrolls smoothly without exception
    await tester.tap(find.byKey(const ValueKey('nav_contact_button')));
    await tester.pumpAndSettle();

    // Test tapping footer contact link
    await tester.tap(find.byKey(const ValueKey('footer_contact_link')));
    await tester.pumpAndSettle();

    // Re-verify contact section still visible
    expect(find.text('Contact Peter Lee'), findsOneWidget);
  });

  testWidgets('LandingPage displays Contact section on mobile screen size', (WidgetTester tester) async {
    // Mobile viewport
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      const MaterialApp(
        home: LandingPage(),
      ),
    );
    await tester.pumpAndSettle();

    // Verify Nav Contact button is visible on mobile
    expect(find.byKey(const ValueKey('nav_contact_button')), findsOneWidget);

    // Tap Nav contact button to scroll to Contact section on mobile
    await tester.tap(find.byKey(const ValueKey('nav_contact_button')));
    await tester.pumpAndSettle();

    // Verify Contact section is in view on mobile
    expect(find.text('Contact Peter Lee'), findsOneWidget);
    expect(find.text('Email: Peter@PNC.co.nz'), findsOneWidget);
    expect(find.text('Phone: 022 533 6867'), findsOneWidget);
  });
}
