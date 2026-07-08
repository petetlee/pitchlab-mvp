const fs = require('fs');

const file = 'c:/Users/petet/.gemini/antigravity/scratch/Pitchlab-AntiGravity/frontend/lib/evaluation_wizard.dart';
let txt = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const anchor = "              _formData[key] = val.recognizedWords;\n" +
"            }\n" +
"      appBar: AppBar(";

const replacement = "              _formData[key] = val.recognizedWords;\n" +
"            }\n" +
"            if (val.hasConfidenceRating && val.confidence > 0) {\n" +
"              _confidence = val.confidence;\n" +
"            }\n" +
"          }),\n" +
"        );\n" +
"      }\n" +
"    } else {\n" +
"      setState(() => _isListening = false);\n" +
"      _speech.stop();\n" +
"    }\n" +
"  }\n\n" +
"  Future<void> _submitEvaluation() async {\n" +
"    setState(() => _isLoading = true);\n" +
"    print('🚀 PitchLab: _formData being submitted: $_formData');\n" +
"    \n" +
"    try {\n" +
"      var user = FirebaseAuth.instance.currentUser;\n" +
"      print('🚀 PitchLab: Submitting evaluation. Current User: ${user?.uid}');\n" +
"      \n" +
"      if (user == null) {\n" +
"        print('🚀 PitchLab: No user found in Wizard session, attempting immediate sign-in...');\n" +
"        final creds = await FirebaseAuth.instance.signInAnonymously();\n" +
"        user = creds.user;\n" +
"        print('✅ PitchLab: Wizard immediate sign-in successful. UID: ${user?.uid}');\n" +
"      }\n\n" +
"      if (user == null) {\n" +
"        throw Exception('Authentication required. Please check your connection and try again.');\n" +
"      }\n\n" +
"      print('🚀 PitchLab: Forcing token refresh to ensure propagation...');\n" +
"      await user.getIdToken(true);\n\n" +
"      print('🚀 PitchLab: Calling pitchLabEvaluation (us-central1)...');\n" +
"      final callable = FirebaseFunctions.instanceFor(region: 'us-central1')\n" +
"          .httpsCallable('pitchLabEvaluation', options: HttpsCallableOptions(timeout: const Duration(seconds: 300)));\n" +
"      final result = await callable.call(_formData);\n" +
"      print('✅ PitchLab: Function call successful. Data: ${result.data}');\n" +
"      \n" +
"      if (!mounted) return;\n" +
"      \n" +
"      Navigator.pushReplacement(\n" +
"        context,\n" +
"        MaterialPageRoute(\n" +
"          builder: (context) => ResultsDashboard(\n" +
"            evaluation: Map<String, dynamic>.from(result.data),\n" +
"          ),\n" +
"        ),\n" +
"      );\n" +
"    } catch (e) {\n" +
"      print('❌ PitchLab SUBMISSION ERROR: $e');\n" +
"      if (!mounted) return;\n" +
"      \n" +
"      String friendlyError = 'Submission failed: $e';\n" +
"      if (e.toString().contains('unauthenticated')) {\n" +
"        friendlyError = 'Authentication Error: Your session expired or was rejected by the server. Please try again.';\n" +
"      }\n" +
"      \n" +
"      ScaffoldMessenger.of(context).showSnackBar(\n" +
"        SnackBar(\n" +
"          content: Text(friendlyError),\n" +
"          backgroundColor: Colors.redAccent,\n" +
"        ),\n" +
"      );\n" +
"    } finally {\n" +
"      if (mounted) setState(() => _isLoading = false);\n" +
"    }\n" +
"  }\n\n" +
"  @override\n" +
"  Widget build(BuildContext context) {\n" +
"    return Scaffold(\n" +
"      backgroundColor: Colors.white,\n" +
"      appBar: AppBar(";

if(txt.includes(anchor)) {
    fs.writeFileSync(file, txt.replace(anchor, replacement), 'utf8');
    console.log("Success! Extracted exactly and put it all back beautifully.");
} else {
    console.log("Anchor not found.");
}
