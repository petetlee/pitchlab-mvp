const fs = require('fs');
const file = 'frontend/lib/evaluation_wizard.dart';
let txt = fs.readFileSync(file, 'utf8');

const oldBad = "  Future<void> _submitEvaluation() async {\n" +
"    setState(() => _isLoading = true);\n" +
"          ),\n" +
"        ),\n" +
"      );";

const targetGood = "  Future<void> _submitEvaluation() async {\n" +
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
"      }\n" +
"\n" +
"      if (user == null) {\n" +
"        throw Exception('Authentication required. Please check your connection and try again.');\n" +
"      }\n" +
"\n" +
"      print('🚀 PitchLab: Forcing token refresh to ensure propagation...');\n" +
"      await user?.getIdToken(true);\n" +
"\n" +
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
"      );";

if(txt.includes(oldBad)) {
    fs.writeFileSync(file, txt.replace(oldBad, targetGood), 'utf8');
    console.log("Success");
} else {
    console.log("Could not find the target text.");
}
