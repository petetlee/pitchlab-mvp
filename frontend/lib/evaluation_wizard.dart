import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'results_dashboard.dart';

class EvaluationWizard extends StatefulWidget {
  final Map<String, dynamic>? initialData;
  const EvaluationWizard({super.key, this.initialData});

  @override
  State<EvaluationWizard> createState() => _EvaluationWizardState();
}

class _EvaluationWizardState extends State<EvaluationWizard> {
  final PageController _pageController = PageController();
  int _currentStep = 0;
  bool _isLoading = false;
  final Map<String, TextEditingController> _controllers = {};
  late stt.SpeechToText _speech;
  bool _isListening = false;
  double _confidence = 1.0;

  final Map<String, dynamic> _formData = {
    'idea': '',
    'category': 'General',
    'problem': '',
    'targetMarket': '',
    'experience': '',
    'capacity': '',
    'budget': '',
    'network': '',
  };

  @override
  void initState() {
    super.initState();
    
    // Initialize form data with initialData if provided, else defaults
    if (widget.initialData != null) {
      widget.initialData!.forEach((key, value) {
        if (_formData.containsKey(key)) {
          _formData[key] = value;
        }
      });
    }

    for (var q in _questions) {
      if (q['key'] != null) {
        final initialValue = _formData[q['key']!]?.toString() ?? '';
        _controllers[q['key']!] = TextEditingController(text: initialValue);
      }
    }
    _speech = stt.SpeechToText();
    if (widget.initialData == null) {
      _loadFounderProfile();
    }
  }

  Future<void> _loadFounderProfile() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      final doc = await FirebaseFirestore.instance
          .collection('FounderProfiles')
          .doc(user.uid)
          .get();
      
      if (doc.exists && mounted) {
        final data = doc.data()!;
        setState(() {
          _formData['experience'] = data['experience'] ?? '';
          _formData['capacity'] = data['capacity']?.toString() ?? '';
          _formData['network'] = data['network'] ?? '';
          
          _controllers['experience']?.text = data['experience'] ?? '';
          _controllers['capacity']?.text = data['capacity']?.toString() ?? '';
          _controllers['network']?.text = data['network'] ?? '';
        });
      }
    }
  }

  @override
  void dispose() {
    for (var controller in _controllers.values) {
      controller.dispose();
    }
    _pageController.dispose();
    super.dispose();
  }

  final List<Map<String, String>> _questions = [
    {
      'key': 'idea',
      'title': 'The Big Idea',
      'subtitle': 'Describe your business in one sentence.',
      'hint': 'e.g., An Uber-like service for pet grooming.'
    },
    {
      'key': 'problem',
      'title': 'The Problem',
      'subtitle': 'What pain point are you solving?',
      'hint': 'e.g., Pet owners struggle to find reliable groomers on short notice.'
    },
    {
      'key': 'targetMarket',
      'title': 'The Market',
      'subtitle': 'Who are your primary customers?',
      'hint': 'e.g., Busy professionals in urban areas with high-maintenance pets.'
    },
    {
      'key': 'experience',
      'title': 'Founder Metrics',
      'subtitle': 'What is your relevant experience?',
      'hint': 'e.g., 5 years in pet industry / Software developer.'
    },
    {
      'key': 'capacity',
      'title': 'Capacity',
      'subtitle': 'Hours per week available?',
      'hint': 'e.g., 15 hours per week while working full-time.'
    },
    {
      'key': 'budget',
      'title': 'MVP Budget',
      'subtitle': 'Total budget for Launch?',
      'hint': r'e.g., $3,000 NZD (be honest!)'
    },
    {
      'key': 'network',
      'title': 'The Network',
      'subtitle': 'Access to mentors/early customers?',
      'hint': 'e.g., Access to 3 pet grooming associations.'
    },
  ];

  void _nextStep() {
    if (_currentStep < _questions.length - 1) {
      _pageController.nextPage(
        duration: 400.ms,
        curve: Curves.easeInOutCubic,
      );
      setState(() {
        _currentStep++;
      });
    } else {
      _submitEvaluation();
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      _pageController.previousPage(
        duration: 400.ms,
        curve: Curves.easeInOutCubic,
      );
      setState(() {
        _currentStep--;
      });
    }
  }

  void _listen(String? key) async {
    if (!_isListening) {
      bool available = await _speech.initialize(
        onStatus: (val) => print('onStatus: $val'),
        onError: (val) => print('onError: $val'),
      );
      if (available) {
        setState(() => _isListening = true);
        _speech.listen(
          onResult: (val) => setState(() {
            if (key != null && _controllers.containsKey(key)) {
              _controllers[key]!.text = val.recognizedWords;
              _formData[key] = val.recognizedWords;
            }
            if (val.hasConfidenceRating && val.confidence > 0) {
              _confidence = val.confidence;
            }
          }),
        );
      }
    } else {
      setState(() => _isListening = false);
      _speech.stop();
    }
  }

  Future<void> _submitEvaluation() async {
    setState(() => _isLoading = true);
    print('🚀 PitchLab: _formData being submitted: $_formData');
    
    try {
      var user = FirebaseAuth.instance.currentUser;
      print('🚀 PitchLab: Submitting evaluation. Current User: ${user?.uid}');
      
      // If user exists, try to aggressively refresh the token.
      // If the backend emulator was restarted, the token signature is invalid and this will throw!
      if (user != null) {
        try {
          print('🚀 PitchLab: Forcing token refresh to ensure propagation...');
          await user.getIdToken(true);
        } catch (tokenError) {
          print('⚠️ PitchLab: Token refresh failed (likely Emulator restart): $tokenError');
          print('⚠️ PitchLab: Forcing sign out to clear corrupt token state...');
          await FirebaseAuth.instance.signOut();
          user = null; // Proceed to immediate error below
        }
      }

      // Ensure user is signed in with a real account (not anonymous)
      if (user == null || user.isAnonymous) {
        if (user?.isAnonymous ?? false) {
          await FirebaseAuth.instance.signOut();
        }
        throw Exception('Authentication required. Please log in with a registered account.');
      }

      print('🚀 PitchLab: Calling pitchLabEvaluation (us-central1)...');
      final callable = FirebaseFunctions.instanceFor(region: 'us-central1')
          .httpsCallable('pitchLabEvaluation', options: HttpsCallableOptions(timeout: const Duration(seconds: 300)));
      final result = await callable.call(_formData);
      print('✅ PitchLab: Function call successful. Data: ${result.data}');
      
      if (!mounted) return;
      
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => ResultsDashboard(
            evaluation: Map<String, dynamic>.from(result.data),
          ),
        ),
      );
    } catch (e) {
      print('❌ PitchLab SUBMISSION ERROR: $e');
      if (!mounted) return;
      
      String friendlyError = 'Submission failed: $e';
      if (e.toString().contains('unauthenticated')) {
        friendlyError = 'Authentication Error: Your session expired or was rejected by the server. Please try again.';
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(friendlyError),
          backgroundColor: Colors.redAccent,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: (_currentStep + 1) / _questions.length,
            backgroundColor: const Color(0xFFE5E5EA),
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF0071E3)),
            minHeight: 8,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : PageView.builder(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _questions.length,
              itemBuilder: (context, index) {
                final question = _questions[index];
                return Padding(
                  padding: const EdgeInsets.all(32.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Step ${index + 1} of ${_questions.length}',
                        style: GoogleFonts.inter(
                          color: const Color(0xFF0071E3),
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ).animate().fadeIn(),
                      const SizedBox(height: 8),
                      Text(
                        question['title']!,
                        style: GoogleFonts.outfit(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF1D1D1F),
                        ),
                      ).animate().fadeIn().moveX(begin: -10, end: 0),
                      const SizedBox(height: 12),
                      Text(
                        question['subtitle']!,
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          color: const Color(0xFF86868B),
                        ),
                      ).animate().fadeIn(delay: 100.ms),
                      const SizedBox(height: 48),
                      TextField(
                          controller: _controllers[question['key']],
                          onChanged: (val) => _formData[question['key']!] = val,
                          decoration: InputDecoration(
                            hintText: question['hint'],
                            hintStyle: GoogleFonts.inter(color: const Color(0xffC7C7CC)),
                            enabledBorder: const UnderlineInputBorder(
                              borderSide: BorderSide(color: Color(0xFFE5E5EA)),
                            ),
                            focusedBorder: const UnderlineInputBorder(
                              borderSide: BorderSide(color: Color(0xFF0071E3), width: 2),
                            ),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _isListening ? Icons.mic : Icons.mic_none,
                                color: _isListening ? Colors.red : const Color(0xFF0071E3),
                              ),
                              onPressed: () => _listen(question['key']),
                            ),
                          ),
                          style: GoogleFonts.inter(fontSize: 20),
                          maxLines: null,
                          autofocus: true,
                        ).animate().fadeIn(delay: 200.ms),
                      const Spacer(),
                      Row(
                        children: [
                          if (_currentStep > 0)
                            Expanded(
                              flex: 1,
                              child: Container(
                                height: 56,
                                margin: const EdgeInsets.only(right: 12),
                                child: OutlinedButton(
                                  onPressed: _previousStep,
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: Color(0xFFE5E5EA)),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                  child: Text(
                                    'Back',
                                    style: GoogleFonts.inter(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: const Color(0xFF1D1D1F),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          Expanded(
                            flex: 2,
                            child: SizedBox(
                              height: 56,
                              child: ElevatedButton(
                                onPressed: _nextStep,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF1D1D1F),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: Text(
                                  index == _questions.length - 1 ? 'Get My Score' : 'Continue',
                                  style: GoogleFonts.inter(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ).animate().fadeIn(delay: 300.ms),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
