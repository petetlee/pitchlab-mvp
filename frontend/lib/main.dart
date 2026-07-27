import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'firebase_options.dart';
import 'landing_page.dart';

void main() async {
  print('🚀 PitchLab: main() started');
  WidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = true;
  
  // Try to initialize Firebase but don't hang effectively forever if it fails
  try {
    await _initializeServices().timeout(
      const Duration(seconds: 10),
      onTimeout: () {
        print('⚠️ PitchLab: Firebase initialization timed out after 10s');
        throw TimeoutException('Firebase initialization timed out');
      },
    );
  } catch (e) {
    print('❌ PitchLab: Initialization failed or timed out: $e');
    // We continue to runApp so the user at least sees the UI (even if Firebase fails later)
  }

  print('🚀 PitchLab: Calling runApp(MyApp())');
  runApp(const MyApp());
}

Future<void> _initializeServices() async {
  try {
    FirebaseApp app;
    if (Firebase.apps.isEmpty) {
      print('🚀 PitchLab: Initializing Firebase...');
      app = await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    } else {
      print('🚀 PitchLab: Firebase already initialized, using existing app');
      app = Firebase.app();
    }
    print('🚀 PitchLab: Firebase App: ${app.name}');

    final bool isLocalhost = kDebugMode ||
        (kIsWeb && Uri.base.host == 'localhost') ||
        (kIsWeb && Uri.base.host == '127.0.0.1');

    if (isLocalhost) {
      print('🚀 PitchLab: Localhost/Debug mode detected. Connecting to emulators at 127.0.0.1...');
      print('🚀 PitchLab: Configured API Key: ${app.options.apiKey.substring(0, 5)}...');
      print('🚀 PitchLab: Configured Project ID: ${app.options.projectId}');
      
      try {
        final emulatorHost = kIsWeb ? 'localhost' : '10.0.2.2'; // 10.0.2.2 for Android emulator
        print('🚀 PitchLab: Using emulator host: $emulatorHost');

        // Auth emulator
        print('🚀 PitchLab: Requesting Auth emulator connection to $emulatorHost:9099...');
        await FirebaseAuth.instance.useAuthEmulator(emulatorHost, 9099);
        print('✅ PitchLab: Auth emulator setup complete for ${FirebaseAuth.instance.app.name}');

        // Firestore emulator
        print('🚀 PitchLab: Setting up Firestore emulator on $emulatorHost:8080...');
        FirebaseFirestore.instance.useFirestoreEmulator(emulatorHost, 8080);
        
        // Functions emulator
        print('🚀 PitchLab: Setting up Functions emulator on $emulatorHost:5001...');
        FirebaseFunctions.instanceFor(region: 'us-central1').useFunctionsEmulator(emulatorHost, 5001);
        
        print('✅ PitchLab: All emulators connected and configured');
      } catch (e) {
        print('❌ PitchLab: Error connecting to emulators: $e');
      }
    } else {
      print('🚀 PitchLab: Running in PRODUCTION mode (connecting to live Firebase)');
    }
  } catch (e, stack) {
    print('❌ PitchLab CRITICAL ERROR during init: $e');
    print('Detailed Stack Trace: $stack');
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    print('🚀 PitchLab: MyApp.build() called');
    return MaterialApp(
      title: 'PitchLab',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0071E3)),
        useMaterial3: true,
      ),
      home: const LandingPage(),
    );
  }
}
